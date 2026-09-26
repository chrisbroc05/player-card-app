"""Persist studio wizard orders so checkout survives redeploys."""

from __future__ import annotations

from sqlalchemy.orm import Session

from models import StudioOrder, utcnow


def save_studio_order(db: Session, user_id: int, order: dict) -> None:
    oid = int(order["id"])
    row = db.get(StudioOrder, oid)
    if row is None:
        db.add(StudioOrder(id=oid, user_id=user_id, payload=dict(order)))
    else:
        row.user_id = user_id
        row.payload = dict(order)
        row.updated_at = utcnow()
    db.commit()


def load_studio_order(db: Session, order_id: int, *, user_id: int | None = None) -> dict | None:
    row = db.get(StudioOrder, int(order_id))
    if row is None:
        return None
    if user_id is not None and row.user_id != user_id:
        return None
    payload = row.payload
    return dict(payload) if isinstance(payload, dict) else None


def max_studio_order_id(db: Session) -> int:
    row = db.query(StudioOrder.id).order_by(StudioOrder.id.desc()).first()
    return int(row[0]) if row else 0
