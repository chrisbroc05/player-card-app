"""Unified user activity history from trades, marketplace, and animations."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session, joinedload

from card_pricing import animated_upgrade_price, highlight_card_price, tier_generation_price
from card_repo import (
    animation_fields_for_card,
    cards_created_by_user_filter,
    highlight_fields_for_card,
)
from marketplace_repo import float_from_decimal
from marketplace_trade_repo import OFFER_TYPE_CASH
from models import Card, MarketplaceOffer, TradeOffer, User

logger = logging.getLogger(__name__)

ACTIVITY_TYPES = frozenset(
    {
        "trade_sent",
        "trade_received",
        "marketplace_sold",
        "marketplace_bought",
        "animated_upgrade",
        "highlight_upgrade",
        "card_created",
    }
)


def _iso(dt: datetime | None) -> str:
    if dt is None:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def _completed_ts(dt: datetime | None) -> datetime:
    if dt is None:
        return datetime.min.replace(tzinfo=timezone.utc)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _grad_year_int(card: Card) -> int:
    try:
        return int(card.grad_year or 0)
    except (TypeError, ValueError):
        return 0


def _card_snapshot(card: Card) -> dict:
    """Full media-capable card payload so highlight/animated thumbnails can render."""
    row = {
        "card_id": card.card_id or "",
        "player_name": card.player_name or "",
        "team_name": card.team_name or "",
        "position": card.position or "",
        "jersey_number": card.jersey_number or "",
        "grad_year": _grad_year_int(card),
        "tier": card.tier or "rookie",
        "theme": card.theme or "none",
        "rarity": card.rarity or "",
        "edition_number": int(card.edition_number or 1),
        "print_run": int(card.print_run or 1),
        "image_url": card.image_url or "",
    }
    row.update(animation_fields_for_card(card))
    row.update(highlight_fields_for_card(card))
    return row


def _counterparty(display_name: str | None, user_id: int | None = None) -> dict | None:
    name = (display_name or "").strip()
    if not name:
        return None
    return {"display_name": name, "user_id": user_id}


def _build_item(
    *,
    item_id: str,
    activity_type: str,
    completed_at: datetime | None,
    created_at: datetime | None,
    card: Card,
    counterparty: dict | None,
    amount: float | None,
    royalty_amount: float | None = None,
) -> dict:
    when = completed_at or created_at
    row = {
        "id": item_id,
        "activity_type": activity_type,
        "created_at": _iso(created_at or when),
        "completed_at": _iso(when),
        "card": _card_snapshot(card),
        "counterparty": counterparty,
        "amount": amount,
        "status": "completed",
        "_sort_ts": _completed_ts(when),
    }
    if royalty_amount is not None:
        row["royalty_amount"] = royalty_amount
    return row


def gather_user_activity_items(db: Session, user_id: int) -> list[dict]:
    """Collect all completed activity rows for a user (unsorted)."""
    items: list[dict] = []

    trade_rows = (
        db.query(TradeOffer)
        .options(
            joinedload(TradeOffer.card),
            joinedload(TradeOffer.sender),
            joinedload(TradeOffer.recipient),
        )
        .filter(
            TradeOffer.status == "accepted",
            (TradeOffer.sender_id == user_id) | (TradeOffer.recipient_id == user_id),
        )
        .all()
    )
    for offer in trade_rows:
        card = offer.card
        if card is None:
            continue
        when = offer.updated_at or offer.created_at
        if offer.sender_id == user_id:
            items.append(
                _build_item(
                    item_id=f"trade_sent-{offer.id}",
                    activity_type="trade_sent",
                    completed_at=when,
                    created_at=offer.created_at,
                    card=card,
                    counterparty=_counterparty(
                        offer.recipient.display_name if offer.recipient else None,
                        offer.recipient_id,
                    ),
                    amount=None,
                )
            )
        if offer.recipient_id == user_id:
            items.append(
                _build_item(
                    item_id=f"trade_received-{offer.id}",
                    activity_type="trade_received",
                    completed_at=when,
                    created_at=offer.created_at,
                    card=card,
                    counterparty=_counterparty(
                        offer.sender.display_name if offer.sender else None,
                        offer.sender_id,
                    ),
                    amount=None,
                )
            )

    marketplace_rows = (
        db.query(MarketplaceOffer)
        .options(
            joinedload(MarketplaceOffer.card),
            joinedload(MarketplaceOffer.buyer),
            joinedload(MarketplaceOffer.seller),
        )
        .filter(
            MarketplaceOffer.status == "accepted",
            (MarketplaceOffer.buyer_id == user_id) | (MarketplaceOffer.seller_id == user_id),
        )
        .all()
    )
    for offer in marketplace_rows:
        card = offer.card
        if card is None:
            continue
        when = offer.updated_at or offer.created_at
        is_cash = (offer.offer_type or OFFER_TYPE_CASH).strip().lower() == OFFER_TYPE_CASH
        amount = float_from_decimal(offer.offer_amount) if is_cash else None

        if offer.buyer_id == user_id:
            items.append(
                _build_item(
                    item_id=f"marketplace_bought-{offer.id}",
                    activity_type="marketplace_bought",
                    completed_at=when,
                    created_at=offer.created_at,
                    card=card,
                    counterparty=_counterparty(
                        offer.seller.display_name if offer.seller else None,
                        offer.seller_id,
                    ),
                    amount=amount,
                )
            )
        if offer.seller_id == user_id:
            royalty_amount = None
            if is_cash and amount is not None:
                royalty_amount = float_from_decimal(offer.royalty_amount)
            items.append(
                _build_item(
                    item_id=f"marketplace_sold-{offer.id}",
                    activity_type="marketplace_sold",
                    completed_at=when,
                    created_at=offer.created_at,
                    card=card,
                    counterparty=_counterparty(
                        offer.buyer.display_name if offer.buyer else None,
                        offer.buyer_id,
                    ),
                    amount=amount,
                    royalty_amount=royalty_amount,
                )
            )

    animated_rows = (
        db.query(Card)
        .filter(
            cards_created_by_user_filter(user_id),
            Card.is_animated.is_(True),
            Card.animation_status == "completed",
        )
        .all()
    )
    animated_price = animated_upgrade_price()
    for card in animated_rows:
        when = card.animation_completed_at or card.created_at
        items.append(
            _build_item(
                item_id=f"animated_upgrade-{card.id}",
                activity_type="animated_upgrade",
                completed_at=when,
                created_at=card.created_at,
                card=card,
                counterparty=None,
                amount=animated_price,
            )
        )

    highlight_rows = (
        db.query(Card)
        .filter(
            cards_created_by_user_filter(user_id),
            Card.is_highlight.is_(True),
            Card.highlight_status == "completed",
        )
        .all()
    )
    highlight_price = highlight_card_price()
    for card in highlight_rows:
        when = card.highlight_uploaded_at or card.created_at
        items.append(
            _build_item(
                item_id=f"highlight_upgrade-{card.id}",
                activity_type="highlight_upgrade",
                completed_at=when,
                created_at=card.created_at,
                card=card,
                counterparty=None,
                amount=highlight_price,
            )
        )

    standard_rows = (
        db.query(Card)
        .filter(
            cards_created_by_user_filter(user_id),
            Card.is_animated.is_(False),
            Card.is_highlight.is_(False),
        )
        .all()
    )
    for card in standard_rows:
        when = card.created_at
        items.append(
            _build_item(
                item_id=f"card_created-{card.id}",
                activity_type="card_created",
                completed_at=when,
                created_at=card.created_at,
                card=card,
                counterparty=None,
                amount=tier_generation_price(card.tier),
            )
        )

    return items


def list_user_activity_history(
    db: Session,
    user: User,
    *,
    limit: int = 50,
    offset: int = 0,
    activity_type: str | None = None,
) -> tuple[list[dict], int]:
    """Return paginated activity items newest first."""
    items = gather_user_activity_items(db, user.id)

    if activity_type:
        normalized = activity_type.strip().lower()
        if normalized in ACTIVITY_TYPES:
            items = [i for i in items if i["activity_type"] == normalized]
        elif normalized == "trades":
            items = [i for i in items if i["activity_type"] in ("trade_sent", "trade_received")]

    items.sort(key=lambda row: row["_sort_ts"], reverse=True)
    total = len(items)
    page = items[offset : offset + limit]

    for row in page:
        row.pop("_sort_ts", None)

    logger.info(
        "activity_history user_id=%s email=%s total=%s limit=%s offset=%s type_filter=%s returned=%s",
        user.id,
        user.email,
        total,
        limit,
        offset,
        activity_type,
        len(page),
    )

    return page, total
