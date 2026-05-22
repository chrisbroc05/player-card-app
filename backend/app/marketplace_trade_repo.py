"""Marketplace card-trade offers (multi-card payment)."""

from __future__ import annotations

import logging
from decimal import Decimal

from sqlalchemy.orm import Session

from card_repo import get_card_by_card_id
from marketplace_repo import clear_marketplace_listing, float_from_decimal
from models import Card, MarketplaceOffer, MarketplaceTradeCard, User, utcnow

logger = logging.getLogger(__name__)

TRADE_SIDE_BUYER = "buyer_offer"
TRADE_SIDE_SELLER = "seller_counter"
OFFER_TYPE_CASH = "cash"
OFFER_TYPE_CARD_TRADE = "card_trade"


def card_trade_row_dict(card: Card) -> dict:
    return {
        "card_id": card.card_id,
        "player_name": card.player_name,
        "team_name": card.team_name or "",
        "tier": card.tier,
        "rarity": card.rarity,
        "image_url": card.image_url,
        "edition_number": card.edition_number,
        "print_run": card.print_run,
    }


def get_trade_cards_for_offer(db: Session, offer_id: int, side: str) -> list[dict]:
    rows = (
        db.query(MarketplaceTradeCard, Card)
        .join(Card, MarketplaceTradeCard.card_id == Card.id)
        .filter(MarketplaceTradeCard.offer_id == offer_id, MarketplaceTradeCard.side == side)
        .order_by(MarketplaceTradeCard.id.asc())
        .all()
    )
    return [card_trade_row_dict(card) for _, card in rows]


def offer_trade_fields(db: Session, offer: MarketplaceOffer) -> dict:
    ot = (offer.offer_type or OFFER_TYPE_CASH).strip().lower()
    return {
        "offer_type": ot,
        "trade_cards_offered": get_trade_cards_for_offer(db, offer.id, TRADE_SIDE_BUYER),
        "trade_cards_counter": get_trade_cards_for_offer(db, offer.id, TRADE_SIDE_SELLER),
    }


def format_trade_cards_email_lines(cards: list[dict], *, max_show: int = 5) -> str:
    if not cards:
        return "No cards listed"
    lines = []
    for c in cards[:max_show]:
        lines.append(f"{c.get('player_name') or 'Card'} ({c.get('card_id') or '?'})")
    extra = len(cards) - max_show
    if extra > 0:
        lines.append(f"+ {extra} more card{'s' if extra != 1 else ''}")
    return "; ".join(lines)


def _card_in_pending_marketplace_trade(db: Session, card_internal_id: int, *, exclude_offer_id: int | None) -> bool:
    q = (
        db.query(MarketplaceTradeCard.id)
        .join(MarketplaceOffer, MarketplaceTradeCard.offer_id == MarketplaceOffer.id)
        .filter(
            MarketplaceTradeCard.card_id == card_internal_id,
            MarketplaceOffer.status == "pending",
        )
    )
    if exclude_offer_id is not None:
        q = q.filter(MarketplaceOffer.id != exclude_offer_id)
    return q.first() is not None


def validate_trade_card_ids_for_user(
    db: Session,
    *,
    user_id: int,
    trade_card_ids: list[str],
    exclude_listing_card_id: str | None = None,
    exclude_offer_id: int | None = None,
) -> list[Card]:
    """Resolve and validate cards the user may offer in a trade."""
    if not trade_card_ids:
        raise ValueError("Select at least one card to offer in trade")

    seen: set[str] = set()
    cards: list[Card] = []
    for raw in trade_card_ids:
        key = (raw or "").strip().upper()
        if not key or key in seen:
            continue
        seen.add(key)
        card = get_card_by_card_id(db, key)
        if card is None:
            raise ValueError(f"Card not found: {raw}")
        if card.owner_id != user_id:
            raise ValueError(f"You do not own card {card.card_id}")
        if (card.status or "active") != "active":
            raise ValueError(f"Card {card.card_id} is not available (status: {card.status})")
        if card.listed_on_marketplace:
            raise ValueError(f"Card {card.card_id} is listed on the marketplace — unlist it first")
        if exclude_listing_card_id and card.card_id == exclude_listing_card_id:
            raise ValueError("You cannot include the listed card in your trade offer")
        if _card_in_pending_marketplace_trade(db, card.id, exclude_offer_id=exclude_offer_id):
            raise ValueError(f"Card {card.card_id} is already part of another pending trade offer")
        cards.append(card)

    if not cards:
        raise ValueError("Select at least one card to offer in trade")
    return cards


def attach_trade_cards(
    db: Session,
    *,
    offer_id: int,
    side: str,
    cards: list[Card],
    lock_pending_trade: bool,
) -> None:
    for card in cards:
        row = MarketplaceTradeCard(offer_id=offer_id, card_id=card.id, side=side)
        db.add(row)
        if lock_pending_trade:
            card.status = "pending_trade"
            card.trade_offered_to = None


def release_trade_cards_for_offer(
    db: Session,
    offer_id: int,
    *,
    sides: list[str] | None = None,
) -> None:
    q = db.query(MarketplaceTradeCard).filter(MarketplaceTradeCard.offer_id == offer_id)
    if sides:
        q = q.filter(MarketplaceTradeCard.side.in_(sides))
    for row in q.all():
        card = db.query(Card).filter(Card.id == row.card_id).first()
        if card is None:
            continue
        if (card.status or "active") == "pending_trade":
            card.status = "active"
            card.trade_offered_to = None


def cancel_pending_offers_with_trade_release(
    db: Session,
    *,
    listing_card_id: str,
    except_offer_id: int,
    now,
) -> list[MarketplaceOffer]:
    others = (
        db.query(MarketplaceOffer)
        .filter(
            MarketplaceOffer.card_id == listing_card_id,
            MarketplaceOffer.status == "pending",
            MarketplaceOffer.id != except_offer_id,
        )
        .all()
    )
    for other in others:
        release_trade_cards_for_offer(db, other.id)
        other.status = "cancelled"
        other.updated_at = now
    return others


def transfer_card_to_user(db: Session, card: Card, user: User) -> None:
    card.owner_id = user.id
    card.owner_name = user.display_name
    card.status = "active"
    card.trade_offered_to = None


def execute_card_trade_accept(
    db: Session,
    offer: MarketplaceOffer,
    listing_card: Card,
    *,
    include_seller_counter: bool,
) -> None:
    """Complete ownership transfers for an accepted card-trade offer."""
    buyer = db.query(User).filter(User.id == offer.buyer_id).first()
    seller = db.query(User).filter(User.id == offer.seller_id).first()
    if buyer is None or seller is None:
        raise ValueError("Buyer or seller account not found")

    now = utcnow()
    transfer_card_to_user(db, listing_card, buyer)
    clear_marketplace_listing(listing_card)

    buyer_rows = (
        db.query(MarketplaceTradeCard, Card)
        .join(Card, MarketplaceTradeCard.card_id == Card.id)
        .filter(MarketplaceTradeCard.offer_id == offer.id, MarketplaceTradeCard.side == TRADE_SIDE_BUYER)
        .all()
    )
    for _, card in buyer_rows:
        transfer_card_to_user(db, card, seller)

    if include_seller_counter:
        counter_rows = (
            db.query(MarketplaceTradeCard, Card)
            .join(Card, MarketplaceTradeCard.card_id == Card.id)
            .filter(
                MarketplaceTradeCard.offer_id == offer.id,
                MarketplaceTradeCard.side == TRADE_SIDE_SELLER,
            )
            .all()
        )
        for _, card in counter_rows:
            transfer_card_to_user(db, card, buyer)

    cancel_pending_offers_with_trade_release(
        db,
        listing_card_id=listing_card.card_id,
        except_offer_id=offer.id,
        now=now,
    )

