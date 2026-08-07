"""User-facing auth-related routes (JWT session)."""

from __future__ import annotations

from datetime import datetime, timezone

from card_repo import animation_fields_for_card, highlight_fields_for_card
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


class ProfileCardOut(BaseModel):
    """Full card payload for profile highlight sections (video-capable thumbnails)."""

    model_config = ConfigDict(extra="forbid")

    card_id: str
    player_name: str
    team_name: str = ""
    position: str = ""
    jersey_number: str = ""
    grad_year: int = 0
    tier: str
    theme: str
    rarity: str = ""
    edition_number: int = 1
    print_run: int = 1
    image_url: str

    is_animated: bool = False
    animated_video_url: str | None = None
    animation_status: str | None = None
    animation_motion: str | None = None
    action_category: str | None = None
    player_photo_url: str | None = None
    photo_notes: str | None = None
    animation_scenario_id: str | None = None

    is_highlight: bool = False
    highlight_video_url: str | None = None
    highlight_thumbnail_url: str | None = None
    highlight_status: str | None = None
    highlight_uploaded_at: str | None = None
    highlight_trim_start: float | None = None
    highlight_trim_end: float | None = None


class RarestCardOut(ProfileCardOut):
    pass


class MarketplaceHighlightOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    offer_amount: float
    buyer_display_name: str | None = None
    accepted_at: str | None = None
    card: ProfileCardOut


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
    marketplace_activity_count: int = 0
    marketplace_stats: MarketplaceStatsOut


def _member_since_label(created_at: datetime) -> str:
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    return created_at.strftime("%B %Y")


def _grad_year_int(card: Card) -> int:
    try:
        return int(card.grad_year or 0)
    except (TypeError, ValueError):
        return 0


def _profile_card_out(card: Card) -> ProfileCardOut:
    row = {
        "card_id": card.card_id or "",
        "player_name": card.player_name or "",
        "team_name": card.team_name or "",
        "position": card.position or "",
        "jersey_number": card.jersey_number or "",
        "grad_year": _grad_year_int(card),
        "tier": card.tier or "rookie",
        "theme": card.theme or "none",
        "rarity": card.rarity or "",
        "edition_number": int(card.edition_number or 1),
        "print_run": int(card.print_run or 1),
        "image_url": card.image_url or "",
    }
    row.update(animation_fields_for_card(card))
    row.update(highlight_fields_for_card(card))
    return ProfileCardOut(**row)


def _iso_dt(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def _highlight_from_offer(db: Session, offer: MarketplaceOffer | None) -> MarketplaceHighlightOut | None:
    if offer is None:
        return None
    card_row = offer.card
    if card_row is None:
        card_row = db.query(Card).filter(Card.card_id == offer.card_id).first()
    if card_row is None:
        return None
    buyer_name = None
    if offer.buyer is not None:
        buyer_name = (offer.buyer.display_name or "").strip() or None
    when = offer.updated_at or offer.created_at
    return MarketplaceHighlightOut(
        offer_amount=float_from_decimal(offer.offer_amount),
        buyer_display_name=buyer_name,
        accepted_at=_iso_dt(when),
        card=_profile_card_out(card_row),
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
        rarest_out = RarestCardOut(**_profile_card_out(kpis.rarest_card).model_dump())

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
        marketplace_activity_count=kpis.marketplace_activity_count,
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
