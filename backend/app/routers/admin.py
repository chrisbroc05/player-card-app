"""
Admin dashboard API — separate JWT (role=admin) from regular user auth.
"""

from __future__ import annotations

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import ALGORITHM, SECRET_KEY
from beta_config import beta_mode_active, get_beta_invite_code, set_beta_invite_code
from database import get_db
from marketplace_repo import float_from_decimal, listing_active_filter
from models import Card, MarketplaceOffer, TradeOffer, User, utcnow

router = APIRouter()
admin_security = HTTPBearer(auto_error=False)

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


def _map_tier_key(db_tier: str) -> str | None:
    t = (db_tier or "").lower().replace("-", "_")
    if t == "rookie":
        return "rookie"
    if t in ("allstar", "all_star"):
        return "all_star"
    if t == "legends":
        return "legends"
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

    return {
        "total_users": total_users,
        "total_cards": total_cards,
        "total_trades": total_trades,
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
            "created_at": _iso(u.created_at),
            "card_count": card_counts.get(u.id, 0),
            "trades_sent": sent_counts.get(u.id, 0),
            "trades_received": recv_counts.get(u.id, 0),
        }
        for u in users
    ]


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
    Sender = User
    Recipient = User
    rows = (
        db.query(TradeOffer, Card.card_id, Card.player_name, Sender.display_name, Sender.email, Recipient.display_name, Recipient.email)
        .join(Card, TradeOffer.card_id == Card.id)
        .join(Sender, TradeOffer.sender_id == Sender.id)
        .join(Recipient, TradeOffer.recipient_id == Recipient.id)
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
    Buyer = User
    Seller = User
    rows = (
        db.query(
            MarketplaceOffer,
            Card.player_name,
            Buyer.display_name,
            Buyer.email,
            Seller.display_name,
            Seller.email,
        )
        .join(Card, MarketplaceOffer.card_id == Card.card_id)
        .join(Buyer, MarketplaceOffer.buyer_id == Buyer.id)
        .join(Seller, MarketplaceOffer.seller_id == Seller.id)
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
