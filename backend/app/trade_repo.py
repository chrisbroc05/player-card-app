"""Trade offer persistence and helpers."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session, joinedload

from models import Card, TradeOffer, User


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def find_recipient_by_identifier(db: Session, identifier: str) -> User | None:
    s = (identifier or "").strip()
    if not s:
        return None
    email = s.lower()
    u = db.query(User).filter(User.email == email).first()
    if u:
        return u
    return db.query(User).filter(User.display_name.ilike(s)).first()


def pending_offer_for_card(db: Session, card_internal_id: int) -> TradeOffer | None:
    return (
        db.query(TradeOffer)
        .filter(TradeOffer.card_id == card_internal_id, TradeOffer.status == "pending")
        .first()
    )


def pending_offer_id_for_card(db: Session, card_internal_id: int) -> int | None:
    row = pending_offer_for_card(db, card_internal_id)
    return row.id if row else None


def list_incoming_pending(db: Session, recipient_id: int) -> list[TradeOffer]:
    return (
        db.query(TradeOffer)
        .options(joinedload(TradeOffer.card), joinedload(TradeOffer.sender), joinedload(TradeOffer.recipient))
        .filter(TradeOffer.recipient_id == recipient_id, TradeOffer.status == "pending")
        .order_by(TradeOffer.created_at.desc())
        .all()
    )


def list_outgoing_pending(db: Session, sender_id: int) -> list[TradeOffer]:
    return (
        db.query(TradeOffer)
        .options(joinedload(TradeOffer.card), joinedload(TradeOffer.sender), joinedload(TradeOffer.recipient))
        .filter(TradeOffer.sender_id == sender_id, TradeOffer.status == "pending")
        .order_by(TradeOffer.created_at.desc())
        .all()
    )


def count_incoming_pending(db: Session, recipient_id: int) -> int:
    return len(list_incoming_pending(db, recipient_id))


def get_trade_by_id(db: Session, trade_id: int) -> TradeOffer | None:
    return (
        db.query(TradeOffer)
        .options(joinedload(TradeOffer.card), joinedload(TradeOffer.sender), joinedload(TradeOffer.recipient))
        .filter(TradeOffer.id == trade_id)
        .first()
    )
