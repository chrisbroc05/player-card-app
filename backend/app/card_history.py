"""Build chronological card lifetime events from existing tables."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session, aliased

from marketplace_repo import float_from_decimal
from models import Card, MarketplaceOffer, TradeOffer, User


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
        events.append(
            {
                "event_type": "created",
                "event_date": _iso(card.created_at),
                "description": f"Card created by {creator_name}",
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
                "description": f"Listed on Free Agency for ${price:.2f}",
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
        amount = float_from_decimal(offer.offer_amount)
        events.append(
            {
                "event_type": "sold",
                "event_date": _iso(when),
                "description": f"Sold to {buyer.display_name} for ${amount:.2f}",
                "actor": buyer.display_name,
            }
        )

    events.sort(key=lambda e: e.get("event_date") or "")
    return events
