"""Marketplace (Free Agency) persistence helpers."""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from card_repo import animation_fields_for_card
from models import Card, MarketplaceOffer, User, utcnow


ROYALTY_RATE = Decimal("0.02")


def compute_royalty_amount(offer_amount: Decimal) -> Decimal:
    return (offer_amount * ROYALTY_RATE).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def decimal_from_float(value: float) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def float_from_decimal(value: Decimal | None) -> float:
    if value is None:
        return 0.0
    return float(value)


def count_pending_offers_for_card(db: Session, card_id: str) -> int:
    return int(
        db.query(func.count(MarketplaceOffer.id))
        .filter(MarketplaceOffer.card_id == card_id, MarketplaceOffer.status == "pending")
        .scalar()
        or 0
    )


def cancel_pending_marketplace_offers_for_card(
    db: Session,
    card_id: str,
    *,
    commit: bool = False,
) -> int:
    """Cancel all pending marketplace offers for a collectible id. Returns rows updated."""
    now = utcnow()
    pending = (
        db.query(MarketplaceOffer)
        .filter(MarketplaceOffer.card_id == card_id, MarketplaceOffer.status == "pending")
        .all()
    )
    for offer in pending:
        offer.status = "cancelled"
        offer.updated_at = now
    if commit and pending:
        db.commit()
    return len(pending)


def clear_marketplace_listing(card: Card) -> None:
    card.listed_on_marketplace = False
    card.asking_price = None
    card.listed_at = None
    card.listing_expires_at = None


def _iso(dt: datetime | None) -> str:
    if dt is None:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def _grad_year_int(card: Card) -> int:
    try:
        return int(card.grad_year or 0)
    except (TypeError, ValueError):
        return 0


def listing_active_filter(now: datetime):
    """Listed rows that are not past listing_expires_at (NULL = legacy, never expires via clock)."""
    return or_(Card.listing_expires_at.is_(None), Card.listing_expires_at > now)


def days_remaining_calendar(expires_at: datetime | None, now: datetime | None = None) -> int | None:
    if expires_at is None:
        return None
    if now is None:
        now = utcnow()
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    delta = expires_at - now
    return max(0, delta.days)


def listing_dict(card: Card, owner_display_name: str, *, pending_offer_count: int | None = None) -> dict:
    now = utcnow()
    row = {
        "card_id": card.card_id,
        "player_name": card.player_name,
        "team_name": card.team_name,
        "position": card.position or "",
        "jersey_number": card.jersey_number or "",
        "grad_year": _grad_year_int(card),
        "tier": card.tier,
        "theme": card.theme or "none",
        "rarity": card.rarity,
        "edition_number": card.edition_number,
        "print_run": card.print_run,
        "image_url": card.image_url,
        "asking_price": float_from_decimal(card.asking_price),
        "listed_at": _iso(card.listed_at),
        "listing_expires_at": _iso(card.listing_expires_at),
        "owner_display_name": owner_display_name,
        "owner_id": card.owner_id,
    }
    dr = days_remaining_calendar(card.listing_expires_at, now)
    row["days_remaining"] = dr if dr is not None else None
    if pending_offer_count is not None:
        row["pending_offer_count"] = pending_offer_count
    row.update(animation_fields_for_card(card))
    return row


def get_listed_card_or_none(db: Session, card_id: str) -> Card | None:
    now = utcnow()
    return (
        db.query(Card)
        .filter(
            Card.card_id == card_id,
            Card.listed_on_marketplace.is_(True),
            listing_active_filter(now),
        )
        .first()
    )
