"""Marketplace (Free Agency) persistence helpers."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from card_repo import animation_fields_for_card, highlight_fields_for_card
from models import Card, MarketplaceOffer, User, utcnow


ROYALTY_RATE = Decimal("0.02")
PRIORITY_LISTING_FEE = Decimal("2.00")
PRIORITY_LISTING_DAYS = 7

logger = logging.getLogger(__name__)


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


_PREVIOUS_OFFER_STATUSES = frozenset({"accepted", "declined", "expired"})


def viewer_offer_flags_by_card(
    db: Session,
    *,
    buyer_id: int,
    card_ids: list[str],
) -> dict[str, dict[str, bool | float | None]]:
    """Per-card offer history for the browsing buyer (batch query)."""
    if not card_ids:
        return {}

    offers = (
        db.query(MarketplaceOffer)
        .filter(
            MarketplaceOffer.buyer_id == buyer_id,
            MarketplaceOffer.card_id.in_(card_ids),
        )
        .order_by(MarketplaceOffer.created_at.desc())
        .all()
    )

    grouped: dict[str, list[MarketplaceOffer]] = {}
    for offer in offers:
        grouped.setdefault(offer.card_id, []).append(offer)

    out: dict[str, dict[str, bool | float | None]] = {}
    for card_id in card_ids:
        rows = grouped.get(card_id, [])
        pending = next((row for row in rows if row.status == "pending"), None)
        previous = next((row for row in rows if row.status in _PREVIOUS_OFFER_STATUSES), None)
        pending_offer = pending is not None
        previous_offer = previous is not None
        amount_source = pending or previous
        offer_amount = float_from_decimal(amount_source.offer_amount) if amount_source else None
        out[card_id] = {
            "pending_offer": pending_offer,
            "previous_offer": previous_offer,
            "offer_amount": offer_amount,
        }
    return out


def cancel_pending_marketplace_offers_for_card(
    db: Session,
    card_id: str,
    *,
    commit: bool = False,
) -> int:
    """Cancel all pending marketplace offers for a collectible id. Returns rows updated."""
    from marketplace_trade_repo import release_trade_cards_for_offer

    now = utcnow()
    pending = (
        db.query(MarketplaceOffer)
        .filter(MarketplaceOffer.card_id == card_id, MarketplaceOffer.status == "pending")
        .all()
    )
    for offer in pending:
        release_trade_cards_for_offer(db, offer.id)
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
    clear_priority_listing(card)


def is_active_priority_listing(card: Card, now: datetime | None = None) -> bool:
    if not getattr(card, "is_priority_listing", False):
        return False
    now = now or utcnow()
    exp = card.priority_expires_at
    if exp is None:
        return True
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    return exp > now


def apply_priority_listing(card: Card, *, now: datetime | None = None) -> None:
    now = now or utcnow()
    card.is_priority_listing = True
    card.priority_listed_at = now
    card.priority_expires_at = now + timedelta(days=PRIORITY_LISTING_DAYS)


def clear_priority_listing(card: Card) -> None:
    card.is_priority_listing = False
    card.priority_listed_at = None
    card.priority_expires_at = None


def log_priority_listing_pending_charge(*, card_id: str, user_id: int) -> None:
    """Stub until Stripe — records intent to charge PRIORITY_LISTING_FEE."""
    logger.info(
        "Priority listing pending charge: card_id=%s user_id=%s amount=%s status=pending_stripe",
        card_id,
        user_id,
        PRIORITY_LISTING_FEE,
    )


def _sort_standard_listing_rows(
    rows: list[tuple[Card, str]],
    *,
    sort_by: str,
    order_desc: bool,
) -> list[tuple[Card, str]]:
    sort_key = (sort_by or "listed_at").strip().lower()

    def key_price(item: tuple[Card, str]) -> float:
        return float_from_decimal(item[0].asking_price)

    def key_name(item: tuple[Card, str]) -> str:
        return (item[0].player_name or "").lower()

    def key_listed(item: tuple[Card, str]) -> float:
        dt = item[0].listed_at
        if dt is None:
            return 0.0
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.timestamp()

    if sort_key == "asking_price":
        return sorted(rows, key=key_price, reverse=order_desc)
    if sort_key == "player_name":
        return sorted(rows, key=key_name, reverse=order_desc)
    return sorted(rows, key=key_listed, reverse=order_desc)


def partition_and_sort_marketplace_rows(
    rows: list[tuple[Card, str]],
    *,
    sort_by: str,
    sort_order: str,
    now: datetime | None = None,
) -> list[tuple[Card, str]]:
    """Priority listings first (by priority_listed_at desc), then standard with user sort."""
    now = now or utcnow()
    priority: list[tuple[Card, str]] = []
    standard: list[tuple[Card, str]] = []
    for card, owner_name in rows:
        if is_active_priority_listing(card, now):
            priority.append((card, owner_name))
        else:
            standard.append((card, owner_name))

    def priority_key(item: tuple[Card, str]) -> float:
        dt = item[0].priority_listed_at
        if dt is None:
            return 0.0
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.timestamp()

    priority.sort(key=priority_key, reverse=True)
    order_desc = (sort_order or "desc").strip().lower() != "asc"
    standard = _sort_standard_listing_rows(standard, sort_by=sort_by, order_desc=order_desc)
    return priority + standard


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
    row["is_priority_listing"] = is_active_priority_listing(card)
    row["priority_listed_at"] = _iso(card.priority_listed_at)
    row["priority_expires_at"] = _iso(card.priority_expires_at)
    row.update(animation_fields_for_card(card))
    row.update(highlight_fields_for_card(card))
    return row


def buyer_offer_row_dict(
    offer: MarketplaceOffer,
    card: Card,
    *,
    seller_display_name: str,
) -> dict:
    """Serialize a buyer's offer with embedded card details (listing status not required)."""
    asking = float_from_decimal(card.asking_price) if card.asking_price is not None else None
    row = {
        "offer_id": offer.id,
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
        "offer_amount": float_from_decimal(offer.offer_amount),
        "asking_price": asking,
        "status": offer.status,
        "message": offer.message or "",
        "created_at": _iso(offer.created_at),
        "updated_at": _iso(offer.updated_at),
        "seller_display_name": seller_display_name,
        "owner_display_name": seller_display_name,
    }
    row.update(animation_fields_for_card(card))
    row.update(highlight_fields_for_card(card))
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
