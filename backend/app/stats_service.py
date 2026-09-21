"""Period-based profile stats for the stat sheet."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

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
class MonthlyStatPoint:
    month: str
    earnings: float
    spending: float
    cards_created: int


@dataclass
class TopSalePoint:
    player_name: str
    sale_price: float


@dataclass
class StatsSummary:
    cards_created: int
    cards_sold: int
    total_earned: float
    total_spent: float
    best_sale: float
    collection_count: int
    monthly_data: list[MonthlyStatPoint] = field(default_factory=list)
    top_sales: list[TopSalePoint] = field(default_factory=list)


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


def _month_start(year: int, month: int) -> datetime:
    return datetime(year, month, 1, tzinfo=timezone.utc)


def _next_month_start(year: int, month: int) -> datetime:
    if month == 12:
        return _month_start(year + 1, 1)
    return _month_start(year, month + 1)


def _last_n_month_ranges(
    n: int,
    now: datetime | None = None,
) -> list[tuple[str, datetime, datetime]]:
    """Return (label, start, end) for the last n calendar months, oldest first."""
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    ranges: list[tuple[str, datetime, datetime]] = []
    y, m = now.year, now.month
    for offset in range(n - 1, -1, -1):
        total = y * 12 + m - 1 - offset
        yy = total // 12
        mm = total % 12 + 1
        start = _month_start(yy, mm)
        end = now if offset == 0 else _next_month_start(yy, mm)
        ranges.append((start.strftime("%b"), start, end))
    return ranges


def _weekly_ranges_for_month(
    year: int,
    month: int,
    *,
    cap_end: datetime | None = None,
) -> list[tuple[str, datetime, datetime]]:
    """Split a calendar month into four week buckets (Week 1–Week 4)."""
    month_start = _month_start(year, month)
    month_end = _next_month_start(year, month)
    ranges: list[tuple[str, datetime, datetime]] = []

    for i in range(4):
        start = month_start + timedelta(days=i * 7)
        end = month_start + timedelta(days=(i + 1) * 7) if i < 3 else month_end

        if cap_end is not None:
            if start >= cap_end:
                ranges.append((f"Week {i + 1}", start, start))
                continue
            end = min(end, cap_end)

        ranges.append((f"Week {i + 1}", start, end))

    return ranges


def _year_month_ranges(now: datetime) -> list[tuple[str, datetime, datetime]]:
    """Monthly buckets from January through the current month."""
    ranges: list[tuple[str, datetime, datetime]] = []
    for m in range(1, now.month + 1):
        start = _month_start(now.year, m)
        end = now if m == now.month else _next_month_start(now.year, m)
        ranges.append((start.strftime("%b"), start, end))
    return ranges


def _chart_data_ranges(period: str, now: datetime) -> list[tuple[str, datetime, datetime]]:
    if period == "this_month":
        return _weekly_ranges_for_month(now.year, now.month, cap_end=now)

    if period == "last_month":
        first_this = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if first_this.month == 1:
            year, month = first_this.year - 1, 12
        else:
            year, month = first_this.year, first_this.month - 1
        return _weekly_ranges_for_month(year, month)

    if period == "this_year":
        return _year_month_ranges(now)

    return _last_n_month_ranges(12, now)


def _apply_created_filter(query, model_created_col, start: datetime | None, end: datetime | None):
    if start is not None:
        query = query.filter(model_created_col >= start)
    if end is not None:
        query = query.filter(model_created_col < end)
    return query


def _sum_earned(db: Session, user_id: int, start: datetime, end: datetime) -> float:
    if start >= end:
        return 0.0
    q = db.query(func.coalesce(func.sum(CreditLedger.amount), 0)).filter(
        CreditLedger.user_id == user_id,
        CreditLedger.transaction_type.in_(EARN_TX_TYPES),
        CreditLedger.amount > 0,
        CreditLedger.created_at >= start,
        CreditLedger.created_at < end,
    )
    return float_from_decimal(q.scalar())


def _sum_spent(db: Session, user_id: int, start: datetime, end: datetime) -> float:
    if start >= end:
        return 0.0
    q = db.query(func.coalesce(func.sum(func.abs(CreditLedger.amount)), 0)).filter(
        CreditLedger.user_id == user_id,
        CreditLedger.transaction_type.in_(SPEND_TX_TYPES),
        CreditLedger.amount < 0,
        CreditLedger.created_at >= start,
        CreditLedger.created_at < end,
    )
    return float_from_decimal(q.scalar())


def _count_cards_created(db: Session, user_id: int, start: datetime, end: datetime) -> int:
    if start >= end:
        return 0
    created_f = cards_created_by_user_filter(user_id)
    q = db.query(func.count(Card.id)).filter(
        created_f,
        Card.created_at >= start,
        Card.created_at < end,
    )
    return int(q.scalar() or 0)


def _compute_chart_data(
    db: Session,
    user_id: int,
    period: str,
    now: datetime | None = None,
) -> list[MonthlyStatPoint]:
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    return [
        MonthlyStatPoint(
            month=label,
            earnings=_sum_earned(db, user_id, start, end),
            spending=_sum_spent(db, user_id, start, end),
            cards_created=_count_cards_created(db, user_id, start, end),
        )
        for label, start, end in _chart_data_ranges(period, now)
    ]


def _compute_top_sales(
    db: Session,
    user_id: int,
    start: datetime | None,
    end: datetime | None,
    *,
    limit: int = 5,
) -> list[TopSalePoint]:
    q = (
        db.query(MarketplaceOffer, Card)
        .join(Card, MarketplaceOffer.card_id == Card.card_id)
        .filter(
            MarketplaceOffer.seller_id == user_id,
            MarketplaceOffer.status == "accepted",
        )
        .order_by(MarketplaceOffer.offer_amount.desc(), MarketplaceOffer.id.desc())
    )
    q = _apply_created_filter(q, MarketplaceOffer.updated_at, start, end)
    rows = q.limit(limit).all()
    return [
        TopSalePoint(
            player_name=(card.player_name or "Unknown").strip() or "Unknown",
            sale_price=float_from_decimal(offer.offer_amount),
        )
        for offer, card in rows
    ]


def compute_stats_summary(db: Session, user_id: int, period: str) -> StatsSummary:
    period_key = (period or "this_month").strip().lower()
    if period_key not in VALID_PERIODS:
        period_key = "this_month"

    now = datetime.now(timezone.utc)
    start, end = _period_bounds(period_key, now)
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
        monthly_data=_compute_chart_data(db, user_id, period_key, now),
        top_sales=_compute_top_sales(db, user_id, start, end),
    )
