"""
Admin dashboard API — separate JWT (role=admin) from regular user auth.
"""

from __future__ import annotations

import os
import secrets
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import stripe
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func
from sqlalchemy.orm import Session, aliased

from auth import ALGORITHM, SECRET_KEY
from beta_config import beta_mode_active, get_beta_invite_code, set_beta_invite_code
from credit_service import InsufficientCreditsError, TX_WITHDRAWAL, deduct_credits
from database import get_db
from marketplace_repo import float_from_decimal, listing_active_filter
from models import Card, CreditLedger, MarketplaceOffer, TradeOffer, User, utcnow
from stripe_connect import configure_stripe_client, create_onboarding_link

router = APIRouter()
admin_security = HTTPBearer(auto_error=False)
logger = logging.getLogger(__name__)

# Hash ADMIN_PASSWORD once per process (same bcrypt stack as auth.py — avoids passlib/bcrypt4 edge cases).
_admin_password_hash: bytes | None = None


def _get_or_create_admin_password_hash() -> bytes | None:
    global _admin_password_hash
    if _admin_password_hash is not None:
        return _admin_password_hash
    raw = (os.environ.get("ADMIN_PASSWORD") or "").strip()
    if not raw:
        return None
    _admin_password_hash = bcrypt.hashpw(raw.encode("utf-8"), bcrypt.gensalt(rounds=12))
    return _admin_password_hash


def create_admin_access_token() -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    to_encode: dict[str, Any] = {"sub": "admin", "role": "admin", "exp": expire}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def require_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(admin_security),
) -> dict[str, Any]:
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin authentication required",
        )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or expired admin token",
        )
    if payload.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )
    return payload


class AdminLoginBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    email: str = Field(..., min_length=1, max_length=320)
    password: str = Field(..., min_length=1, max_length=256)


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AdminInviteCodesResponse(BaseModel):
    current_code: str
    beta_mode_active: bool


class AdminInviteCodesUpdateBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    new_code: str = Field(default="", max_length=200)


class AdminInviteCodesUpdateResponse(BaseModel):
    success: bool = True
    new_code: str


def _iso(dt: datetime | None) -> str:
    if dt is None:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def _compute_financial_summary(db: Session) -> dict[str, float | int]:
    total_volume = float_from_decimal(
        db.query(func.coalesce(func.sum(CreditLedger.amount), 0))
        .filter(CreditLedger.transaction_type == "card_sale")
        .scalar()
    )
    total_royalties = float_from_decimal(
        db.query(func.coalesce(func.sum(MarketplaceOffer.royalty_amount), 0))
        .filter(
            MarketplaceOffer.status == "accepted",
            MarketplaceOffer.royalty_amount > 0,
        )
        .scalar()
    )
    total_credits_in_circulation = float_from_decimal(
        db.query(func.coalesce(func.sum(User.credit_balance), 0)).scalar()
    )
    total_withdrawals = float_from_decimal(
        db.query(func.coalesce(func.sum(func.abs(CreditLedger.amount)), 0))
        .filter(CreditLedger.transaction_type == "withdrawal")
        .scalar()
    )
    stripe_connected_sellers = int(
        db.query(func.count(User.id)).filter(User.stripe_payouts_enabled.is_(True)).scalar() or 0
    )
    average_sale_price = float_from_decimal(
        db.query(func.coalesce(func.avg(MarketplaceOffer.offer_amount), 0))
        .filter(MarketplaceOffer.status == "accepted")
        .scalar()
    )
    royalties_ledger_total = float_from_decimal(
        db.query(func.coalesce(func.sum(CreditLedger.amount), 0))
        .filter(CreditLedger.transaction_type == "royalty")
        .scalar()
    )
    stripe_balance_total = 0.0
    stripe_balance_available = 0.0
    stripe_balance_pending = 0.0
    stripe_balance_currency = "usd"
    stripe_balance_ok = False
    stripe_error = ""
    try:
        configure_stripe_client()
        bal = stripe.Balance.retrieve()
        avail = bal.get("available") or []
        pend = bal.get("pending") or []
        preferred_currency = "usd"
        available_amount = 0
        pending_amount = 0
        for row in avail:
            if (row.get("currency") or "").lower() == preferred_currency:
                available_amount += int(row.get("amount") or 0)
        for row in pend:
            if (row.get("currency") or "").lower() == preferred_currency:
                pending_amount += int(row.get("amount") or 0)
        stripe_balance_available = round(available_amount / 100.0, 2)
        stripe_balance_pending = round(pending_amount / 100.0, 2)
        stripe_balance_total = round((available_amount + pending_amount) / 100.0, 2)
        stripe_balance_currency = preferred_currency
        stripe_balance_ok = True
        logger.info(
            "Admin Stripe balance fetched: available=%.2f pending=%.2f total=%.2f",
            stripe_balance_available,
            stripe_balance_pending,
            stripe_balance_total,
        )
    except Exception as exc:
        stripe_balance_ok = False
        stripe_error = str(exc)
        logger.warning("Admin Stripe balance fetch failed: %s", stripe_error)
    return {
        "total_volume": total_volume,
        "total_royalties": total_royalties,
        "royalties_ledger_total": royalties_ledger_total,
        "total_credits_in_circulation": total_credits_in_circulation,
        "total_withdrawals": total_withdrawals,
        "stripe_connected_sellers": stripe_connected_sellers,
        "average_sale_price": average_sale_price,
        "stripe_balance_ok": stripe_balance_ok,
        "stripe_balance_total": stripe_balance_total,
        "stripe_balance_available": stripe_balance_available,
        "stripe_balance_pending": stripe_balance_pending,
        "stripe_balance_currency": stripe_balance_currency,
        "stripe_error": stripe_error,
    }


def _map_tier_key(db_tier: str) -> str | None:
    t = (db_tier or "").lower().replace("-", "_")
    if t == "rookie":
        return "rookie"
    if t in ("allstar", "all_star"):
        return "all_star"
    if t == "legends":
        return "legends"
    return None


def _platform_admin_user(db: Session) -> User:
    admin_email_raw = (os.environ.get("ADMIN_EMAIL") or "").strip()
    admin_email = admin_email_raw.lower()
    logger.info("Resolving platform admin user by ADMIN_EMAIL='%s'", admin_email_raw)
    if not admin_email:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "Admin account not configured",
                "detail": (
                    "No user found matching ADMIN_EMAIL. "
                    "Please verify the ADMIN_EMAIL environment variable matches "
                    "the admin user's email in the database exactly."
                ),
            },
        )
    admin_user = db.query(User).filter(func.lower(User.email) == admin_email).first()
    logger.info(
        "Platform admin lookup result for '%s': %s",
        admin_email_raw,
        f"user_id={admin_user.id}, email={admin_user.email}" if admin_user else "none",
    )
    if admin_user is None:
        near_matches = (
            db.query(User.id, User.email)
            .filter(User.email.ilike(f"%{admin_email_raw}%"))
            .limit(5)
            .all()
        )
        logger.error(
            "Admin account not found for email: %s. Near matches: %s",
            admin_email_raw,
            [(int(uid), email) for uid, email in near_matches],
        )
        logger.warning("Auto-creating platform admin user for email: %s", admin_email_raw)
        admin_user = User(
            email=admin_email,
            display_name="Platform Admin",
            hashed_password=f"!platform-admin-autocreated-{uuid.uuid4().hex}",
            parent_email=None,
        )
        try:
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
            logger.warning(
                "Platform admin user auto-created: user_id=%s email=%s",
                admin_user.id,
                admin_user.email,
            )
        except Exception as exc:
            db.rollback()
            logger.error("Failed to auto-create platform admin user: %s", str(exc))
            raise HTTPException(
                status_code=503,
                detail={
                    "error": "Admin account not configured",
                    "detail": (
                        "No user found matching ADMIN_EMAIL. "
                        "Please verify the ADMIN_EMAIL environment variable matches "
                        "the admin user's email in the database exactly."
                    ),
                },
            ) from exc
    return admin_user


def _date_range_start(range_name: str) -> datetime | None:
    now = datetime.now(timezone.utc)
    key = (range_name or "all").strip().lower()
    if key in {"all", "all_time"}:
        return None
    if key == "today":
        return now.replace(hour=0, minute=0, second=0, microsecond=0)
    if key in {"this_week", "week"}:
        start = now - timedelta(days=now.weekday())
        return start.replace(hour=0, minute=0, second=0, microsecond=0)
    if key in {"this_month", "month"}:
        return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return None


@router.post("/login", response_model=AdminLoginResponse)
def admin_login(body: AdminLoginBody):
    """Shared admin login (env credentials). Returns JWT with role=admin (24h)."""
    env_email = (os.environ.get("ADMIN_EMAIL") or "").strip().lower()
    env_password_raw = (os.environ.get("ADMIN_PASSWORD") or "").strip()
    if not env_email or not env_password_raw:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Admin login is not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD "
                "on the backend service (e.g. Render environment variables), then redeploy or restart."
            ),
        )

    submitted_email = body.email.strip().lower()
    if len(submitted_email) != len(env_email) or not secrets.compare_digest(
        submitted_email.encode("utf-8"),
        env_email.encode("utf-8"),
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials",
        )

    ph = _get_or_create_admin_password_hash()
    if ph is None or not bcrypt.checkpw(body.password.encode("utf-8"), ph):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials",
        )

    return AdminLoginResponse(access_token=create_admin_access_token())


@router.get("/stats")
def admin_stats(
    db: Session = Depends(get_db),
    _admin: dict[str, Any] = Depends(require_admin),
):
    total_users = int(db.query(func.count(User.id)).scalar() or 0)
    total_cards = int(db.query(func.count(Card.id)).scalar() or 0)
    total_trades = int(db.query(func.count(TradeOffer.id)).scalar() or 0)

    trades_accepted = int(
        db.query(func.count(TradeOffer.id)).filter(TradeOffer.status == "accepted").scalar() or 0
    )
    trades_declined = int(
        db.query(func.count(TradeOffer.id)).filter(TradeOffer.status == "declined").scalar() or 0
    )
    trades_pending = int(
        db.query(func.count(TradeOffer.id)).filter(TradeOffer.status == "pending").scalar() or 0
    )

    cards_by_tier = {"rookie": 0, "all_star": 0, "legends": 0}
    for tier_val, cnt in db.query(Card.tier, func.count(Card.id)).group_by(Card.tier).all():
        key = _map_tier_key(str(tier_val))
        if key:
            cards_by_tier[key] += int(cnt)

    cards_by_rarity: dict[str, int] = {}
    for rar, cnt in db.query(Card.rarity, func.count(Card.id)).group_by(Card.rarity).all():
        cards_by_rarity[str(rar or "unknown")] = int(cnt)

    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    new_users_last_7_days = int(
        db.query(func.count(User.id)).filter(User.created_at >= week_ago).scalar() or 0
    )
    new_cards_last_7_days = int(
        db.query(func.count(Card.id)).filter(Card.created_at >= week_ago).scalar() or 0
    )

    top_rows = (
        db.query(User.display_name, User.email, func.count(Card.id).label("cc"))
        .outerjoin(Card, Card.owner_id == User.id)
        .group_by(User.id, User.display_name, User.email)
        .having(func.count(Card.id) > 0)
        .order_by(func.count(Card.id).desc())
        .limit(5)
        .all()
    )
    top_creators = [
        {"display_name": str(r[0]), "email": str(r[1]), "card_count": int(r[2] or 0)} for r in top_rows
    ]

    recent_users_rows = db.query(User).order_by(User.created_at.desc()).limit(10).all()
    recent_users = [
        {
            "id": u.id,
            "display_name": u.display_name,
            "email": u.email,
            "created_at": _iso(u.created_at),
        }
        for u in recent_users_rows
    ]

    Owner = User
    recent_cards_q = (
        db.query(Card, Owner.display_name)
        .outerjoin(Owner, Card.owner_id == Owner.id)
        .order_by(Card.created_at.desc())
        .limit(10)
        .all()
    )
    recent_cards = []
    for card, owner_dn in recent_cards_q:
        owner_label = (owner_dn or card.owner_name or "—").strip() or "—"
        recent_cards.append(
            {
                "card_id": card.card_id,
                "player_name": card.player_name,
                "tier": card.tier,
                "theme": card.theme or "none",
                "created_at": _iso(card.created_at),
                "owner_display_name": owner_label,
            }
        )

    total_listed = int(
        db.query(func.count(Card.id))
        .filter(Card.listed_on_marketplace.is_(True), listing_active_filter(utcnow()))
        .scalar()
        or 0
    )
    total_offers = int(db.query(func.count(MarketplaceOffer.id)).scalar() or 0)
    offers_pending = int(
        db.query(func.count(MarketplaceOffer.id))
        .filter(MarketplaceOffer.status == "pending")
        .scalar()
        or 0
    )
    offers_accepted = int(
        db.query(func.count(MarketplaceOffer.id))
        .filter(MarketplaceOffer.status == "accepted")
        .scalar()
        or 0
    )
    offers_declined = int(
        db.query(func.count(MarketplaceOffer.id))
        .filter(MarketplaceOffer.status == "declined")
        .scalar()
        or 0
    )
    offers_expired = int(
        db.query(func.count(MarketplaceOffer.id))
        .filter(MarketplaceOffer.status == "expired")
        .scalar()
        or 0
    )
    offers_countered = int(
        db.query(func.count(MarketplaceOffer.id))
        .filter(MarketplaceOffer.counter_amount.isnot(None))
        .scalar()
        or 0
    )
    counters_accepted = int(
        db.query(func.count(MarketplaceOffer.id))
        .filter(MarketplaceOffer.counter_status == "accepted")
        .scalar()
        or 0
    )
    counters_declined = int(
        db.query(func.count(MarketplaceOffer.id))
        .filter(MarketplaceOffer.counter_status == "declined")
        .scalar()
        or 0
    )
    total_royalties_earned = float_from_decimal(
        db.query(func.coalesce(func.sum(MarketplaceOffer.royalty_amount), 0))
        .filter(MarketplaceOffer.status == "accepted")
        .scalar()
    )
    total_volume = float_from_decimal(
        db.query(func.coalesce(func.sum(MarketplaceOffer.offer_amount), 0))
        .filter(MarketplaceOffer.status == "accepted")
        .scalar()
    )

    total_animated = int(
        db.query(func.count(Card.id)).filter(Card.is_animated.is_(True)).scalar() or 0
    )
    animations_pending = int(
        db.query(func.count(Card.id))
        .filter(Card.animation_status.in_(["pending", "processing"]))
        .scalar()
        or 0
    )
    animations_failed = int(
        db.query(func.count(Card.id)).filter(Card.animation_status == "failed").scalar() or 0
    )
    popular_row = (
        db.query(Card.animation_motion, func.count(Card.id).label("cnt"))
        .filter(Card.is_animated.is_(True), Card.animation_motion.isnot(None))
        .group_by(Card.animation_motion)
        .order_by(func.count(Card.id).desc())
        .first()
    )
    most_popular_motion = popular_row[0] if popular_row and popular_row[0] else ""

    return {
        "total_users": total_users,
        "total_cards": total_cards,
        "total_trades": total_trades,
        "financial_summary": _compute_financial_summary(db),
        "trades_accepted": trades_accepted,
        "trades_declined": trades_declined,
        "trades_pending": trades_pending,
        "cards_by_tier": cards_by_tier,
        "cards_by_rarity": cards_by_rarity,
        "new_users_last_7_days": new_users_last_7_days,
        "new_cards_last_7_days": new_cards_last_7_days,
        "top_creators": top_creators,
        "recent_users": recent_users,
        "recent_cards": recent_cards,
        "marketplace_stats": {
            "total_listed": total_listed,
            "total_offers": total_offers,
            "offers_pending": offers_pending,
            "offers_accepted": offers_accepted,
            "offers_declined": offers_declined,
            "offers_expired": offers_expired,
            "offers_countered": offers_countered,
            "counters_accepted": counters_accepted,
            "counters_declined": counters_declined,
            "total_royalties_earned": total_royalties_earned,
            "total_volume": total_volume,
        },
        "animation_stats": {
            "total_animated": total_animated,
            "animations_pending": animations_pending,
            "animations_failed": animations_failed,
            "most_popular_motion": most_popular_motion,
        },
    }


@router.get("/users")
def admin_users(
    db: Session = Depends(get_db),
    _admin: dict[str, Any] = Depends(require_admin),
):
    users = db.query(User).order_by(User.id.asc()).all()
    card_counts = {
        int(r[0]): int(r[1])
        for r in db.query(Card.owner_id, func.count(Card.id))
        .filter(Card.owner_id.isnot(None))
        .group_by(Card.owner_id)
        .all()
    }
    sent_counts = {
        int(r[0]): int(r[1])
        for r in db.query(TradeOffer.sender_id, func.count(TradeOffer.id)).group_by(TradeOffer.sender_id).all()
    }
    recv_counts = {
        int(r[0]): int(r[1])
        for r in db.query(TradeOffer.recipient_id, func.count(TradeOffer.id))
        .group_by(TradeOffer.recipient_id)
        .all()
    }
    return [
        {
            "id": u.id,
            "display_name": u.display_name,
            "email": u.email,
            "parent_email": u.parent_email or "",
            "created_at": _iso(u.created_at),
            "card_count": card_counts.get(u.id, 0),
            "trades_sent": sent_counts.get(u.id, 0),
            "trades_received": recv_counts.get(u.id, 0),
            "credit_balance": float_from_decimal(u.credit_balance),
            "stripe_payouts_enabled": bool(u.stripe_payouts_enabled),
        }
        for u in users
    ]


@router.get("/financials/summary")
def admin_financials_summary(
    db: Session = Depends(get_db),
    _admin: dict[str, Any] = Depends(require_admin),
):
    return _compute_financial_summary(db)


@router.get("/financials/ledger")
def admin_financials_ledger(
    limit: int = Query(default=25, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    transaction_type: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _admin: dict[str, Any] = Depends(require_admin),
):
    q = db.query(CreditLedger, User.display_name).join(User, CreditLedger.user_id == User.id)
    if transaction_type:
        tx = transaction_type.strip().lower()
        if tx:
            q = q.filter(CreditLedger.transaction_type == tx)

    total_count = int(q.count())
    rows = (
        q.order_by(CreditLedger.created_at.desc(), CreditLedger.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    entries = [
        {
            "id": row.id,
            "user_id": row.user_id,
            "display_name": display_name or "—",
            "amount": float_from_decimal(row.amount),
            "balance_after": float_from_decimal(row.balance_after),
            "transaction_type": row.transaction_type,
            "reference_id": row.reference_id or "",
            "note": row.note or "",
            "created_at": _iso(row.created_at),
        }
        for row, display_name in rows
    ]
    return {
        "entries": entries,
        "total_count": total_count,
        "limit": limit,
        "offset": offset,
    }


@router.get("/financials/royalties")
def admin_financials_royalties(
    limit: int = Query(default=25, ge=1, le=5000),
    offset: int = Query(default=0, ge=0),
    date_range: str = Query(default="all"),
    search: str | None = Query(default=None),
    sort: str = Query(default="desc"),
    db: Session = Depends(get_db),
    _admin: dict[str, Any] = Depends(require_admin),
):
    start_dt = _date_range_start(date_range)
    sort_desc = (sort or "desc").strip().lower() != "asc"
    search_q = (search or "").strip().lower()

    base_filter = [
        MarketplaceOffer.status == "accepted",
        MarketplaceOffer.royalty_amount > 0,
    ]
    if start_dt is not None:
        base_filter.append(func.coalesce(MarketplaceOffer.updated_at, MarketplaceOffer.created_at) >= start_dt)
    total_royalties = float_from_decimal(
        db.query(func.coalesce(func.sum(MarketplaceOffer.royalty_amount), 0))
        .filter(*base_filter)
        .scalar()
    )

    BuyerUser = aliased(User, name="buyer_user")
    SellerUser = aliased(User, name="seller_user")
    rows_query = (
        db.query(
            MarketplaceOffer,
            Card.player_name,
            Card.tier,
            SellerUser.display_name,
            BuyerUser.display_name,
        )
        .join(Card, MarketplaceOffer.card_id == Card.card_id)
        .join(SellerUser, MarketplaceOffer.seller_id == SellerUser.id)
        .join(BuyerUser, MarketplaceOffer.buyer_id == BuyerUser.id)
        .filter(*base_filter)
    )
    if search_q:
        like_term = f"%{search_q}%"
        rows_query = rows_query.filter(
            func.lower(func.coalesce(Card.player_name, "")).like(like_term)
            | func.lower(func.coalesce(SellerUser.display_name, "")).like(like_term)
            | func.lower(func.coalesce(BuyerUser.display_name, "")).like(like_term)
        )

    total_count = int(rows_query.count())
    if sort_desc:
        rows_query = rows_query.order_by(MarketplaceOffer.updated_at.desc(), MarketplaceOffer.id.desc())
    else:
        rows_query = rows_query.order_by(MarketplaceOffer.updated_at.asc(), MarketplaceOffer.id.asc())

    rows = (
        rows_query
        .offset(offset)
        .limit(limit)
        .all()
    )

    all_rows_for_running_total = (
        db.query(MarketplaceOffer.id, MarketplaceOffer.royalty_amount)
        .filter(MarketplaceOffer.status == "accepted", MarketplaceOffer.royalty_amount > 0)
        .order_by(MarketplaceOffer.updated_at.asc(), MarketplaceOffer.id.asc())
        .all()
    )
    running_total_by_offer_id: dict[int, float] = {}
    running = 0.0
    for offer_id, royalty_amount in all_rows_for_running_total:
        running += float_from_decimal(royalty_amount)
        running_total_by_offer_id[int(offer_id)] = round(running, 2)

    entries = [
        {
            "offer_id": offer.id,
            "card_id": offer.card_id,
            "player_name": player_name or "",
            "tier": tier or "",
            "seller_display_name": seller_dn or "—",
            "buyer_display_name": buyer_dn or "—",
            "sale_amount": float_from_decimal(offer.offer_amount),
            "royalty_amount": float_from_decimal(offer.royalty_amount),
            "date": _iso(offer.updated_at or offer.created_at),
            "running_total": running_total_by_offer_id.get(int(offer.id), 0.0),
        }
        for offer, player_name, tier, seller_dn, buyer_dn in rows
    ]
    return {
        "entries": entries,
        "total_royalties": total_royalties,
        "total_count": total_count,
        "date_range": date_range,
        "search": search_q,
        "limit": limit,
        "offset": offset,
    }


@router.get("/royalty-balance")
def admin_royalty_balance(
    db: Session = Depends(get_db),
    _admin: dict[str, Any] = Depends(require_admin),
):
    try:
        admin_user = _platform_admin_user(db)
    except HTTPException as exc:
        if isinstance(exc.detail, dict) and exc.detail.get("error"):
            return JSONResponse(status_code=503, content=exc.detail)
        raise
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    total_royalties_earned = float_from_decimal(
        db.query(func.coalesce(func.sum(CreditLedger.amount), 0))
        .filter(
            CreditLedger.user_id == admin_user.id,
            CreditLedger.transaction_type == "royalty",
        )
        .scalar()
    )
    this_month = float_from_decimal(
        db.query(func.coalesce(func.sum(CreditLedger.amount), 0))
        .filter(
            CreditLedger.user_id == admin_user.id,
            CreditLedger.transaction_type == "royalty",
            CreditLedger.created_at >= month_start,
        )
        .scalar()
    )
    total_withdrawn = float_from_decimal(
        db.query(func.coalesce(func.sum(func.abs(CreditLedger.amount)), 0))
        .filter(
            CreditLedger.user_id == admin_user.id,
            CreditLedger.transaction_type == TX_WITHDRAWAL,
            CreditLedger.amount < 0,
        )
        .scalar()
    )

    pending_withdrawals = 0.0
    stripe_account_id = (admin_user.stripe_account_id or "").strip()
    if stripe_account_id:
        try:
            configure_stripe_client()
            payouts = stripe.Payout.list(limit=25, stripe_account=stripe_account_id)
            pending_cents = 0
            for payout in payouts.get("data", []):
                status_value = (payout.get("status") or "").lower()
                if status_value in {"pending", "in_transit"}:
                    pending_cents += int(payout.get("amount") or 0)
            pending_withdrawals = round(pending_cents / 100.0, 2)
        except Exception as exc:
            pending_withdrawals = 0.0
            logger.warning("Admin pending withdrawals fetch failed: %s", str(exc))

    return {
        "admin_user_id": admin_user.id,
        "admin_email": admin_user.email,
        "total_royalties_earned": round(total_royalties_earned, 2),
        "current_withdrawable_balance": float_from_decimal(admin_user.credit_balance),
        "total_withdrawn": round(total_withdrawn, 2),
        "pending_withdrawals": pending_withdrawals,
        "this_month": round(this_month, 2),
        "connect_ready": bool(admin_user.stripe_payouts_enabled and stripe_account_id),
    }


@router.post("/connect-onboarding-link")
def admin_connect_onboarding_link(
    db: Session = Depends(get_db),
    _admin: dict[str, Any] = Depends(require_admin),
):
    admin_user = _platform_admin_user(db)
    try:
        url = create_onboarding_link(db, admin_user)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create onboarding link: {str(e)}") from e
    return {"url": url}


@router.get("/earnings/monthly")
def admin_earnings_monthly(
    db: Session = Depends(get_db),
    _admin: dict[str, Any] = Depends(require_admin),
):
    now = datetime.now(timezone.utc)
    current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_starts: list[datetime] = []
    year = current_month_start.year
    month = current_month_start.month
    for _ in range(12):
        month_starts.append(datetime(year, month, 1, tzinfo=timezone.utc))
        month -= 1
        if month == 0:
            month = 12
            year -= 1
    month_starts_desc = month_starts
    oldest_start = month_starts_desc[-1]

    rows = (
        db.query(MarketplaceOffer.updated_at, MarketplaceOffer.created_at, MarketplaceOffer.royalty_amount)
        .filter(
            MarketplaceOffer.status == "accepted",
            MarketplaceOffer.royalty_amount > 0,
            func.coalesce(MarketplaceOffer.updated_at, MarketplaceOffer.created_at) >= oldest_start,
        )
        .all()
    )

    totals_by_month_key: dict[str, float] = {
        f"{dt.year:04d}-{dt.month:02d}": 0.0 for dt in month_starts_desc
    }
    for updated_at, created_at, royalty_amount in rows:
        eff = updated_at or created_at
        if eff is None:
            continue
        if eff.tzinfo is None:
            eff = eff.replace(tzinfo=timezone.utc)
        key = f"{eff.year:04d}-{eff.month:02d}"
        if key in totals_by_month_key:
            totals_by_month_key[key] += float_from_decimal(royalty_amount)

    points_desc = []
    for dt in month_starts_desc:
        key = f"{dt.year:04d}-{dt.month:02d}"
        points_desc.append(
            {
                "month_key": key,
                "label": dt.strftime("%b %Y"),
                "total": round(totals_by_month_key[key], 2),
            }
        )
    points = list(reversed(points_desc))
    return {
        "points": points,
        "year_total": round(sum(item["total"] for item in points), 2),
    }


@router.post("/withdraw-royalties")
def admin_withdraw_royalties(
    db: Session = Depends(get_db),
    _admin: dict[str, Any] = Depends(require_admin),
):
    admin_user = _platform_admin_user(db)
    stripe_account_id = (admin_user.stripe_account_id or "").strip()
    if not stripe_account_id or not admin_user.stripe_payouts_enabled:
        raise HTTPException(
            status_code=400,
            detail="Admin Stripe Connect payout account is not fully set up",
        )

    current_balance = float_from_decimal(admin_user.credit_balance)
    if current_balance <= 0:
        raise HTTPException(status_code=400, detail="No withdrawable royalties available")

    try:
        configure_stripe_client()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    try:
        row = deduct_credits(
            admin_user.id,
            admin_user.credit_balance,
            TX_WITHDRAWAL,
            note="Platform royalty withdrawal to Stripe",
            db=db,
            commit=False,
        )
    except InsufficientCreditsError:
        db.rollback()
        raise HTTPException(status_code=400, detail="No withdrawable royalties available") from None

    withdrawal_amount = float_from_decimal(-row.amount)
    amount_cents = int(round(withdrawal_amount * 100))
    try:
        transfer = stripe.Transfer.create(
            amount=amount_cents,
            currency="usd",
            destination=stripe_account_id,
            transfer_group=f"platform_royalty_withdrawal_{admin_user.id}",
            description="Platform royalty withdrawal to Stripe Connect",
            metadata={
                "admin_user_id": str(admin_user.id),
                "type": "platform_royalty_withdrawal",
                "ledger_entry_id": str(row.id or ""),
            },
        )
        payout = stripe.Payout.create(
            amount=amount_cents,
            currency="usd",
            stripe_account=stripe_account_id,
            metadata={
                "admin_user_id": str(admin_user.id),
                "source_transfer_id": str(transfer.get("id") or ""),
                "type": "platform_royalty_withdrawal",
            },
        )
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Withdrawal failed: {str(e)}") from e

    return {
        "success": True,
        "amount_withdrawn": withdrawal_amount,
        "new_balance": float_from_decimal(row.balance_after),
        "transfer_id": transfer.get("id"),
        "payout_id": payout.get("id"),
    }


@router.get("/withdrawal-history")
def admin_withdrawal_history(
    limit: int = Query(default=50, ge=1, le=5000),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _admin: dict[str, Any] = Depends(require_admin),
):
    admin_user = _platform_admin_user(db)
    q = (
        db.query(CreditLedger)
        .filter(
            CreditLedger.user_id == admin_user.id,
            CreditLedger.transaction_type == TX_WITHDRAWAL,
            CreditLedger.amount < 0,
        )
        .order_by(CreditLedger.created_at.desc(), CreditLedger.id.desc())
    )
    total_count = int(q.count())
    rows = q.offset(offset).limit(limit).all()
    pending_amount_counts: dict[int, int] = {}
    stripe_account_id = (admin_user.stripe_account_id or "").strip()
    if stripe_account_id:
        try:
            configure_stripe_client()
            payouts = stripe.Payout.list(limit=100, stripe_account=stripe_account_id)
            for payout in payouts.get("data", []):
                status_value = (payout.get("status") or "").lower()
                if status_value in {"pending", "in_transit"}:
                    cents = int(payout.get("amount") or 0)
                    pending_amount_counts[cents] = pending_amount_counts.get(cents, 0) + 1
        except Exception as exc:
            pending_amount_counts = {}
            logger.warning("Admin withdrawal history payout fetch failed: %s", str(exc))

    all_for_running_total = (
        db.query(CreditLedger.id, CreditLedger.amount)
        .filter(
            CreditLedger.user_id == admin_user.id,
            CreditLedger.transaction_type == TX_WITHDRAWAL,
            CreditLedger.amount < 0,
        )
        .order_by(CreditLedger.created_at.asc(), CreditLedger.id.asc())
        .all()
    )
    running_total_withdrawn_by_id: dict[int, float] = {}
    running_withdrawn = 0.0
    for row_id, amount in all_for_running_total:
        running_withdrawn += abs(float_from_decimal(amount))
        running_total_withdrawn_by_id[int(row_id)] = round(running_withdrawn, 2)

    entries = [
        {
            "id": row.id,
            "amount": abs(float_from_decimal(row.amount)),
            "amount_signed": float_from_decimal(row.amount),
            "balance_after": float_from_decimal(row.balance_after),
            "status": (
                "pending"
                if pending_amount_counts.get(int(round(abs(float_from_decimal(row.amount)) * 100)), 0) > 0
                else "completed"
            ),
            "running_total_withdrawn": running_total_withdrawn_by_id.get(int(row.id), 0.0),
            "reference_id": row.reference_id or "",
            "note": row.note or "",
            "created_at": _iso(row.created_at),
        }
        for row in rows
    ]
    for entry in entries:
        if entry["status"] == "pending":
            cents = int(round(entry["amount"] * 100))
            pending_amount_counts[cents] = max(0, pending_amount_counts.get(cents, 0) - 1)
    return {
        "entries": entries,
        "total_count": total_count,
        "limit": limit,
        "offset": offset,
    }


@router.get("/cards")
def admin_cards(
    db: Session = Depends(get_db),
    _admin: dict[str, Any] = Depends(require_admin),
):
    Owner = User
    rows = (
        db.query(Card, Owner.display_name, Owner.email)
        .outerjoin(Owner, Card.owner_id == Owner.id)
        .order_by(Card.created_at.desc())
        .all()
    )
    out = []
    for card, od, oe in rows:
        out.append(
            {
                "card_id": card.card_id,
                "player_name": card.player_name,
                "team_name": card.team_name,
                "tier": card.tier,
                "theme": card.theme or "none",
                "rarity": card.rarity,
                "edition_number": card.edition_number,
                "print_run": card.print_run,
                "created_at": _iso(card.created_at),
                "owner_display_name": (od or card.owner_name or "—").strip() or "—",
                "owner_email": (oe or "").strip() or "—",
                "status": card.status or "active",
            }
        )
    return out


@router.get("/trades")
def admin_trades(
    db: Session = Depends(get_db),
    _admin: dict[str, Any] = Depends(require_admin),
):
    SenderUser = aliased(User, name="sender_user")
    RecipientUser = aliased(User, name="recipient_user")
    rows = (
        db.query(
            TradeOffer,
            Card.card_id,
            Card.player_name,
            SenderUser.display_name,
            SenderUser.email,
            RecipientUser.display_name,
            RecipientUser.email,
        )
        .join(Card, TradeOffer.card_id == Card.id)
        .join(SenderUser, TradeOffer.sender_id == SenderUser.id)
        .join(RecipientUser, TradeOffer.recipient_id == RecipientUser.id)
        .order_by(TradeOffer.created_at.desc())
        .all()
    )
    out = []
    for offer, cid, pname, sdn, sem, rdn, rem in rows:
        out.append(
            {
                "id": offer.id,
                "card_id": cid,
                "player_name": pname or "",
                "status": offer.status,
                "created_at": _iso(offer.created_at),
                "updated_at": _iso(offer.updated_at),
                "message": offer.message or "",
                "sender_display_name": sdn,
                "sender_email": sem,
                "recipient_display_name": rdn,
                "recipient_email": rem,
            }
        )
    return out


@router.get("/marketplace")
def admin_marketplace(
    db: Session = Depends(get_db),
    _admin: dict[str, Any] = Depends(require_admin),
):
    BuyerUser = aliased(User, name="buyer_user")
    SellerUser = aliased(User, name="seller_user")
    rows = (
        db.query(
            MarketplaceOffer,
            Card.player_name,
            BuyerUser.display_name,
            BuyerUser.email,
            SellerUser.display_name,
            SellerUser.email,
        )
        .join(Card, MarketplaceOffer.card_id == Card.card_id)
        .join(BuyerUser, MarketplaceOffer.buyer_id == BuyerUser.id)
        .join(SellerUser, MarketplaceOffer.seller_id == SellerUser.id)
        .order_by(MarketplaceOffer.created_at.desc())
        .all()
    )
    return [
        {
            "offer_id": offer.id,
            "card_id": offer.card_id,
            "player_name": player_name or "",
            "offer_amount": float_from_decimal(offer.offer_amount),
            "royalty_amount": float_from_decimal(offer.royalty_amount),
            "counter_amount": float_from_decimal(offer.counter_amount) if offer.counter_amount is not None else None,
            "counter_status": offer.counter_status,
            "status": offer.status,
            "created_at": _iso(offer.created_at),
            "updated_at": _iso(offer.updated_at),
            "buyer_display_name": buyer_dn,
            "buyer_email": buyer_email,
            "seller_display_name": seller_dn,
            "seller_email": seller_email,
        }
        for offer, player_name, buyer_dn, buyer_email, seller_dn, seller_email in rows
    ]


@router.get("/invite-codes", response_model=AdminInviteCodesResponse)
def admin_get_invite_codes(_admin: dict[str, Any] = Depends(require_admin)):
    code = get_beta_invite_code() or ""
    return AdminInviteCodesResponse(current_code=code, beta_mode_active=beta_mode_active())


@router.post("/invite-codes", response_model=AdminInviteCodesUpdateResponse)
def admin_set_invite_codes(
    body: AdminInviteCodesUpdateBody,
    _admin: dict[str, Any] = Depends(require_admin),
):
    """
    Updates the in-process invite code used for registration checks.
    Resets on deploy/restart — see beta_config module docstring.
    """
    new_code = set_beta_invite_code(body.new_code)
    return AdminInviteCodesUpdateResponse(new_code=new_code)
