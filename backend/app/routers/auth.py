"""User-facing auth-related routes (JWT session)."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from marketplace_repo import float_from_decimal
from parent_email_utils import normalize_optional_parent_email
from models import Card, MarketplaceOffer, TradeOffer, User

router = APIRouter()


class UpdateProfileBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    parent_email: str | None = Field(default=None, max_length=320)


class RarestCardOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    card_id: str
    player_name: str
    tier: str
    theme: str
    rarity: str
    print_run: int
    image_url: str


class MarketplaceHighlightOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    card_id: str
    player_name: str
    offer_amount: float
    image_url: str


class MarketplaceStatsOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    total_spent: float
    total_earned: float
    highest_purchase: MarketplaceHighlightOut | None = None
    highest_sale: MarketplaceHighlightOut | None = None
    total_offers_made: int
    active_listings: int


class UserProfileResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str
    email: str
    parent_email: str | None = Field(default=None)
    member_since: str
    total_cards_owned: int
    total_cards_ever_created: int
    cards_traded_away: int
    cards_received_via_trade: int
    total_print_run_copies: int
    favorite_tier: str | None = Field(default=None)
    rarest_card: RarestCardOut | None = None
    marketplace_stats: MarketplaceStatsOut


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

    total_spent = float_from_decimal(
        db.query(func.coalesce(func.sum(MarketplaceOffer.offer_amount), 0))
        .filter(MarketplaceOffer.buyer_id == uid, MarketplaceOffer.status == "accepted")
        .scalar()
    )

    total_earned = float_from_decimal(
        db.query(func.coalesce(func.sum(MarketplaceOffer.offer_amount), 0))
        .filter(MarketplaceOffer.seller_id == uid, MarketplaceOffer.status == "accepted")
        .scalar()
    )

    total_offers_made = int(
        db.query(func.count(MarketplaceOffer.id)).filter(MarketplaceOffer.buyer_id == uid).scalar() or 0
    )

    active_listings = int(
        db.query(func.count(Card.id))
        .filter(Card.owner_id == uid, Card.listed_on_marketplace.is_(True))
        .scalar()
        or 0
    )

    def _highlight_from_offer(offer: MarketplaceOffer | None) -> MarketplaceHighlightOut | None:
        if offer is None:
            return None
        card_row = db.query(Card).filter(Card.card_id == offer.card_id).first()
        if card_row is None:
            return None
        return MarketplaceHighlightOut(
            card_id=card_row.card_id,
            player_name=card_row.player_name,
            offer_amount=float_from_decimal(offer.offer_amount),
            image_url=card_row.image_url,
        )

    top_purchase = (
        db.query(MarketplaceOffer)
        .filter(MarketplaceOffer.buyer_id == uid, MarketplaceOffer.status == "accepted")
        .order_by(MarketplaceOffer.offer_amount.desc())
        .first()
    )

    top_sale = (
        db.query(MarketplaceOffer)
        .filter(MarketplaceOffer.seller_id == uid, MarketplaceOffer.status == "accepted")
        .order_by(MarketplaceOffer.offer_amount.desc())
        .first()
    )

    marketplace_stats = MarketplaceStatsOut(
        total_spent=total_spent,
        total_earned=total_earned,
        highest_purchase=_highlight_from_offer(top_purchase),
        highest_sale=_highlight_from_offer(top_sale),
        total_offers_made=total_offers_made,
        active_listings=active_listings,
    )

    return UserProfileResponse(
        display_name=user.display_name,
        email=user.email,
        parent_email=user.parent_email,
        member_since=_member_since_label(created),
        total_cards_owned=total_cards_owned,
        total_cards_ever_created=total_cards_ever_created,
        cards_traded_away=cards_traded_away,
        cards_received_via_trade=cards_received_via_trade,
        total_print_run_copies=total_print_run_copies,
        favorite_tier=favorite_tier,
        rarest_card=rarest_out,
        marketplace_stats=marketplace_stats,
    )


@router.post("/update-profile")
def update_profile(
    body: UpdateProfileBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        user.parent_email = normalize_optional_parent_email(body.parent_email)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid parent email address")
    db.commit()
    db.refresh(user)
    return {"success": True, "parent_email": user.parent_email}
