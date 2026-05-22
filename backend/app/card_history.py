"""Build chronological card lifetime events from existing tables."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session, aliased

from card_repo import animated_upgrade_source_card_id
from marketplace_repo import float_from_decimal
from marketplace_trade_repo import OFFER_TYPE_CARD_TRADE, TRADE_SIDE_BUYER, TRADE_SIDE_SELLER
from models import Card, MarketplaceOffer, MarketplaceTradeCard, TradeOffer, User


def _iso(dt: datetime | None) -> str:
    if dt is None:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def _user_display(db: Session, user_id: int | None, fallback: str = "—") -> str:
    if user_id is None:
        return fallback
    u = db.query(User).filter(User.id == user_id).first()
    return (u.display_name if u else fallback) or fallback


def build_card_history(db: Session, card: Card) -> list[dict]:
    events: list[dict] = []

    creator_name = _user_display(db, card.creator_user_id, card.owner_name or "Unknown")
    if card.created_at:
        source_id = animated_upgrade_source_card_id(card)
        if source_id:
            description = f"Animated edition created from static card {source_id}"
        else:
            description = f"Card created by {creator_name}"
        events.append(
            {
                "event_type": "created",
                "event_date": _iso(card.created_at),
                "description": description,
                "actor": creator_name,
            }
        )

    Sender = aliased(User)
    Recipient = aliased(User)
    trade_rows = (
        db.query(TradeOffer, Sender, Recipient)
        .join(Sender, TradeOffer.sender_id == Sender.id)
        .join(Recipient, TradeOffer.recipient_id == Recipient.id)
        .filter(TradeOffer.card_id == card.id, TradeOffer.status == "accepted")
        .order_by(TradeOffer.updated_at.asc())
        .all()
    )
    for offer, sender, recipient in trade_rows:
        when = offer.updated_at or offer.created_at
        events.append(
            {
                "event_type": "traded",
                "event_date": _iso(when),
                "description": f"Traded from {sender.display_name} to {recipient.display_name}",
                "actor": recipient.display_name,
            }
        )

    if card.listed_on_marketplace and card.listed_at is not None:
        owner_name = _user_display(db, card.owner_id, card.owner_name or "—")
        price = float_from_decimal(card.asking_price)
        events.append(
            {
                "event_type": "listed",
                "event_date": _iso(card.listed_at),
                "description": f"Listed on Free Agency Marketplace for ${price:.2f}",
                "actor": owner_name,
            }
        )

    sale_rows = (
        db.query(MarketplaceOffer, User)
        .join(User, MarketplaceOffer.buyer_id == User.id)
        .filter(
            MarketplaceOffer.card_id == card.card_id,
            MarketplaceOffer.status == "accepted",
        )
        .order_by(MarketplaceOffer.updated_at.asc())
        .all()
    )
    for offer, buyer in sale_rows:
        when = offer.updated_at or offer.created_at
        ot = (offer.offer_type or "").strip().lower()
        if ot == OFFER_TYPE_CARD_TRADE:
            n = (
                db.query(MarketplaceTradeCard)
                .filter(
                    MarketplaceTradeCard.offer_id == offer.id,
                    MarketplaceTradeCard.side == TRADE_SIDE_BUYER,
                )
                .count()
            )
            desc = (
                f"Traded to {buyer.display_name} via marketplace card trade "
                f"({n} card{'s' if n != 1 else ''} offered)"
            )
        else:
            amount = float_from_decimal(offer.offer_amount)
            desc = f"Sold to {buyer.display_name} for ${amount:.2f}"
        events.append(
            {
                "event_type": "sold",
                "event_date": _iso(when),
                "description": desc,
                "actor": buyer.display_name,
            }
        )

    trade_in_rows = (
        db.query(MarketplaceTradeCard, MarketplaceOffer, User)
        .join(MarketplaceOffer, MarketplaceTradeCard.offer_id == MarketplaceOffer.id)
        .join(User, MarketplaceOffer.buyer_id == User.id)
        .filter(
            MarketplaceTradeCard.card_id == card.id,
            MarketplaceOffer.status == "accepted",
            MarketplaceOffer.offer_type == OFFER_TYPE_CARD_TRADE,
        )
        .order_by(MarketplaceOffer.updated_at.asc())
        .all()
    )
    for tc_row, offer, buyer in trade_in_rows:
        listing = db.query(Card).filter(Card.card_id == offer.card_id).first()
        listing_name = listing.player_name if listing else offer.card_id
        when = offer.updated_at or offer.created_at
        if tc_row.side == TRADE_SIDE_BUYER:
            seller = db.query(User).filter(User.id == offer.seller_id).first()
            actor = seller.display_name if seller else "Seller"
            desc = (
                f"Traded to {actor} via marketplace card trade for {listing_name} "
                f"({buyer.display_name}'s offer)"
            )
        else:
            desc = (
                f"Received from seller counter via marketplace card trade for {listing_name}"
            )
            actor = buyer.display_name
        events.append(
            {
                "event_type": "traded",
                "event_date": _iso(when),
                "description": desc,
                "actor": actor,
            }
        )

    events.sort(key=lambda e: e.get("event_date") or "")
    return events
