"""User-facing auth-related routes (JWT session)."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import Card, TradeOffer

router = APIRouter()


class RarestCardOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    card_id: str
    player_name: str
    tier: str
    theme: str
    rarity: str
    print_run: int
    image_url: str


class UserProfileResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str
    email: str
    member_since: str
    total_cards_owned: int
    total_cards_ever_created: int
    cards_traded_away: int
    cards_received_via_trade: int
    total_print_run_copies: int
    favorite_tier: str | None = Field(default=None)
    rarest_card: RarestCardOut | None = None


def _member_since_label(created_at: datetime) -> str:
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    return created_at.strftime("%B %Y")


def _tier_display(db_tier: str) -> str:
    t = (db_tier or "").lower().replace("-", "_")
    if t == "rookie":
        return "Rookie"
    if t in ("allstar", "all_star"):
        return "All-Star"
    if t == "legends":
        return "Legends"
    return db_tier or "Unknown"


def _cards_created_by_user_filter(user_id: int):
    """Cards this user originated (creator set), or legacy rows with no creator still owned by user."""
    return or_(
        Card.creator_user_id == user_id,
        and_(Card.creator_user_id.is_(None), Card.owner_id == user_id),
    )


@router.get("/profile", response_model=UserProfileResponse)
def get_profile(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Aggregate stats for the authenticated user (own cards / trades only)."""
    uid = user.id
    created_f = _cards_created_by_user_filter(uid)

    total_cards_owned = int(db.query(func.count(Card.id)).filter(Card.owner_id == uid).scalar() or 0)

    total_cards_ever_created = int(db.query(func.count(Card.id)).filter(created_f).scalar() or 0)

    cards_traded_away = int(
        db.query(func.count(TradeOffer.id))
        .filter(TradeOffer.sender_id == uid, TradeOffer.status == "accepted")
        .scalar()
        or 0
    )

    cards_received_via_trade = int(
        db.query(func.count(TradeOffer.id))
        .filter(TradeOffer.recipient_id == uid, TradeOffer.status == "accepted")
        .scalar()
        or 0
    )

    total_print_run_copies = int(
        db.query(func.coalesce(func.sum(Card.print_run), 0)).filter(created_f).scalar() or 0
    )

    tier_row = (
        db.query(Card.tier, func.count(Card.id).label("cnt"))
        .filter(created_f)
        .group_by(Card.tier)
        .order_by(func.count(Card.id).desc())
        .first()
    )
    favorite_tier: str | None = None
    if tier_row and int(tier_row[1] or 0) > 0:
        favorite_tier = _tier_display(str(tier_row[0]))

    rarest: Card | None = (
        db.query(Card)
        .filter(Card.owner_id == uid)
        .order_by(Card.print_run.asc(), Card.edition_number.asc(), Card.created_at.asc())
        .first()
    )
    rarest_out: RarestCardOut | None = None
    if rarest is not None:
        rarest_out = RarestCardOut(
            card_id=rarest.card_id,
            player_name=rarest.player_name,
            tier=rarest.tier,
            theme=rarest.theme or "none",
            rarity=rarest.rarity,
            print_run=int(rarest.print_run or 1),
            image_url=rarest.image_url,
        )

    created = user.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)

    return UserProfileResponse(
        display_name=user.display_name,
        email=user.email,
        member_since=_member_since_label(created),
        total_cards_owned=total_cards_owned,
        total_cards_ever_created=total_cards_ever_created,
        cards_traded_away=cards_traded_away,
        cards_received_via_trade=cards_received_via_trade,
        total_print_run_copies=total_print_run_copies,
        favorite_tier=favorite_tier,
        rarest_card=rarest_out,
    )
