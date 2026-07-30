"""User-facing auth-related routes (JWT session)."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import Card, MarketplaceOffer, User
from parent_email_utils import normalize_optional_parent_email
from profile_stats import compute_profile_kpis
from marketplace_repo import float_from_decimal

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
    credit_balance: float = 0.0
    stripe_account_status: str | None = Field(default=None)
    stripe_onboarding_complete: bool = False
    stripe_payouts_enabled: bool = False
    member_since: str
    total_cards_owned: int
    total_cards_ever_created: int
    cards_traded_away: int
    cards_received_via_trade: int
    animated_cards_owned: int = 0
    highlight_cards_owned: int = 0
    total_print_run_copies: int
    favorite_tier: str | None = Field(default=None)
    rarest_card: RarestCardOut | None = None
    marketplace_stats: MarketplaceStatsOut


def _member_since_label(created_at: datetime) -> str:
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    return created_at.strftime("%B %Y")


def _highlight_from_offer(db: Session, offer: MarketplaceOffer | None) -> MarketplaceHighlightOut | None:
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


@router.get("/profile", response_model=UserProfileResponse)
def get_profile(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Aggregate stats for the authenticated user (own cards / trades only)."""
    kpis = compute_profile_kpis(db, user)

    rarest_out: RarestCardOut | None = None
    if kpis.rarest_card is not None:
        rarest = kpis.rarest_card
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

    marketplace_stats = MarketplaceStatsOut(
        total_spent=kpis.total_spent,
        total_earned=kpis.total_earned,
        highest_purchase=_highlight_from_offer(db, kpis.top_purchase),
        highest_sale=_highlight_from_offer(db, kpis.top_sale),
        total_offers_made=kpis.total_offers_made,
        active_listings=kpis.active_listings,
    )

    return UserProfileResponse(
        display_name=user.display_name,
        email=user.email,
        parent_email=user.parent_email,
        credit_balance=float_from_decimal(user.credit_balance),
        stripe_account_status=user.stripe_account_status,
        stripe_onboarding_complete=bool(user.stripe_onboarding_complete),
        stripe_payouts_enabled=bool(user.stripe_payouts_enabled),
        member_since=_member_since_label(created),
        total_cards_owned=kpis.total_cards_owned,
        total_cards_ever_created=kpis.total_cards_ever_created,
        cards_traded_away=kpis.cards_traded_away,
        cards_received_via_trade=kpis.cards_received_via_trade,
        animated_cards_owned=kpis.animated_cards_owned,
        highlight_cards_owned=kpis.highlight_cards_owned,
        total_print_run_copies=kpis.total_print_run_copies,
        favorite_tier=kpis.favorite_tier,
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
