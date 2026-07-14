"""Unified user activity history from trades, marketplace, and animations."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session, joinedload

from card_repo import ANIMATED_UPGRADE_STYLE_PREFIX
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


def _card_snapshot(card: Card) -> dict:
    return {
        "card_id": card.card_id,
        "player_name": card.player_name,
        "tier": card.tier,
        "theme": card.theme or "none",
        "image_url": card.image_url,
    }


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
            Card.creator_user_id == user_id,
            Card.is_animated.is_(True),
            Card.animation_status == "completed",
            Card.style.like(f"{ANIMATED_UPGRADE_STYLE_PREFIX}%"),
        )
        .all()
    )
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
                amount=None,
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
