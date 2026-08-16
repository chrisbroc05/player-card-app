"""Public user profile API — GET /profile/{username}."""

from __future__ import annotations

from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import get_optional_current_user
from card_repo import list_user_public_profile_cards_dicts
from database import get_db
from models import Card, MarketplaceOffer, TradeOffer, User
from profile_slug import find_user_by_profile_slug, profile_slug
from user_settings import user_has_public_collection

router = APIRouter()


class PublicProfileCardOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    card_id: str
    player_name: str
    team_name: str = ""
    tier: str
    theme: str = ""
    rarity: str = ""
    edition_number: int = 1
    print_run: int = 1
    created_at: str
    image_url: str
    shareable_slug: str
    is_animated: bool = False
    animated_video_url: str | None = None
    animation_status: str | None = None
    is_highlight: bool = False
    highlight_video_url: str | None = None
    highlight_status: str | None = None
    listed_on_marketplace: bool = False
    asking_price: float | None = None
    is_public: bool = True


class PublicProfileStatsOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    total_public_cards: int = 0
    cards_traded: int = 0
    cards_sold: int = 0


class PublicProfileResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str
    username: str
    member_since: str
    stats: PublicProfileStatsOut
    public_cards: list[PublicProfileCardOut]
    listed_cards: list[PublicProfileCardOut]
    is_own_profile: bool = False


def _member_since_label(created_at) -> str:
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    return created_at.strftime("%B %Y")


def _card_out(row: dict) -> PublicProfileCardOut:
    return PublicProfileCardOut(
        card_id=row.get("card_id") or "",
        player_name=row.get("player_name") or "",
        team_name=row.get("team_name") or "",
        tier=row.get("tier") or "rookie",
        theme=row.get("theme") or "",
        rarity=row.get("rarity") or "",
        edition_number=int(row.get("edition_number") or 1),
        print_run=int(row.get("print_run") or 1),
        created_at=row.get("created_at") or "",
        image_url=row.get("image_url") or "",
        shareable_slug=row.get("shareable_slug") or "",
        is_animated=bool(row.get("is_animated")),
        animated_video_url=row.get("animated_video_url"),
        animation_status=row.get("animation_status"),
        is_highlight=bool(row.get("is_highlight")),
        highlight_video_url=row.get("highlight_video_url"),
        highlight_status=row.get("highlight_status"),
        listed_on_marketplace=bool(row.get("listed_on_marketplace")),
        asking_price=row.get("asking_price"),
        is_public=bool(row.get("is_public", True)),
    )


@router.get("/{username}", response_model=PublicProfileResponse)
def get_public_profile(
    username: str,
    db: Session = Depends(get_db),
    viewer: User | None = Depends(get_optional_current_user),
):
    user = find_user_by_profile_slug(db, username)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    is_own = viewer is not None and viewer.id == user.id
    card_rows = list_user_public_profile_cards_dicts(db, user.id) if user_has_public_collection(user) else []
    cards = [_card_out(r) for r in card_rows]
    listed = [c for c in cards if c.listed_on_marketplace]

    uid = user.id
    cards_traded = int(
        db.query(func.count(TradeOffer.id))
        .filter(TradeOffer.sender_id == uid, TradeOffer.status == "accepted")
        .scalar()
        or 0
    )
    cards_sold = int(
        db.query(func.count(MarketplaceOffer.id))
        .filter(MarketplaceOffer.seller_id == uid, MarketplaceOffer.status == "accepted")
        .scalar()
        or 0
    )

    created = user.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)

    return PublicProfileResponse(
        display_name=user.display_name,
        username=profile_slug(user.display_name),
        member_since=_member_since_label(created),
        stats=PublicProfileStatsOut(
            total_public_cards=len(cards),
            cards_traded=cards_traded,
            cards_sold=cards_sold,
        ),
        public_cards=cards,
        listed_cards=listed,
        is_own_profile=is_own,
    )
