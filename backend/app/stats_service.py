"""Period-based profile stats for the stat sheet."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from card_repo import cards_created_by_user_filter, owned_collection_filter
from credit_service import (
    TX_ANIMATION,
    TX_CARD_PURCHASE,
    TX_CARD_SALE,
    TX_GENERATION,
    TX_HIGHLIGHT,
    TX_PRIORITY,
    TX_ROYALTY,
)
from marketplace_repo import float_from_decimal
from models import Card, CreditLedger, MarketplaceOffer

VALID_PERIODS = frozenset({"this_month", "last_month", "this_year", "all_time"})

SPEND_TX_TYPES = (
    TX_GENERATION,
    TX_ANIMATION,
    TX_HIGHLIGHT,
    TX_CARD_PURCHASE,
    TX_PRIORITY,
)

EARN_TX_TYPES = (TX_CARD_SALE, TX_ROYALTY)


@dataclass
class StatsSummary:
    cards_created: int
    cards_sold: int
    total_earned: float
    total_spent: float
    best_sale: float
    collection_count: int


def _period_bounds(period: str, now: datetime | None = None) -> tuple[datetime | None, datetime | None]:
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    if period == "this_month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return start, now

    if period == "last_month":
        first_this = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if first_this.month == 1:
            start = first_this.replace(year=first_this.year - 1, month=12)
        else:
            start = first_this.replace(month=first_this.month - 1)
        return start, first_this

    if period == "this_year":
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        return start, now

    return None, None


def _apply_created_filter(query, model_created_col, start: datetime | None, end: datetime | None):
    if start is not None:
        query = query.filter(model_created_col >= start)
    if end is not None:
        query = query.filter(model_created_col < end)
    return query


def compute_stats_summary(db: Session, user_id: int, period: str) -> StatsSummary:
    period_key = (period or "this_month").strip().lower()
    if period_key not in VALID_PERIODS:
        period_key = "this_month"

    start, end = _period_bounds(period_key)
    created_f = cards_created_by_user_filter(user_id)
    collection_f = owned_collection_filter(user_id)

    cards_created_q = db.query(func.count(Card.id)).filter(created_f)
    cards_created_q = _apply_created_filter(cards_created_q, Card.created_at, start, end)
    cards_created = int(cards_created_q.scalar() or 0)

    sold_q = db.query(func.count(MarketplaceOffer.id)).filter(
        MarketplaceOffer.seller_id == user_id,
        MarketplaceOffer.status == "accepted",
    )
    sold_q = _apply_created_filter(sold_q, MarketplaceOffer.updated_at, start, end)
    cards_sold = int(sold_q.scalar() or 0)

    earned_q = db.query(func.coalesce(func.sum(CreditLedger.amount), 0)).filter(
        CreditLedger.user_id == user_id,
        CreditLedger.transaction_type.in_(EARN_TX_TYPES),
        CreditLedger.amount > 0,
    )
    earned_q = _apply_created_filter(earned_q, CreditLedger.created_at, start, end)
    total_earned = float_from_decimal(earned_q.scalar())

    spent_q = db.query(func.coalesce(func.sum(func.abs(CreditLedger.amount)), 0)).filter(
        CreditLedger.user_id == user_id,
        CreditLedger.transaction_type.in_(SPEND_TX_TYPES),
        CreditLedger.amount < 0,
    )
    spent_q = _apply_created_filter(spent_q, CreditLedger.created_at, start, end)
    total_spent = float_from_decimal(spent_q.scalar())

    best_sale_q = (
        db.query(func.coalesce(func.max(MarketplaceOffer.offer_amount), 0))
        .filter(
            MarketplaceOffer.seller_id == user_id,
            MarketplaceOffer.status == "accepted",
        )
    )
    best_sale_q = _apply_created_filter(best_sale_q, MarketplaceOffer.updated_at, start, end)
    best_sale = float_from_decimal(best_sale_q.scalar())

    collection_count = int(db.query(func.count(Card.id)).filter(collection_f).scalar() or 0)

    return StatsSummary(
        cards_created=cards_created,
        cards_sold=cards_sold,
        total_earned=total_earned,
        total_spent=total_spent,
        best_sale=best_sale,
        collection_count=collection_count,
    )
