"""Card animation routes (Runway ML)."""

from __future__ import annotations

import os
import re
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from animation_tasks import process_animation
from card_pricing import animated_upgrade_price, generation_price_payload, normalize_order_tier
from auth import get_current_user
from card_repo import create_animated_upgrade_card, get_card_by_card_id
from credit_service import InsufficientCreditsError, deduct_credits
from data.animation_motions import get_motion_by_id, is_motion_selectable, list_motions_public
from database import get_db
from email_service import _absolute_image_url
from marketplace_repo import cancel_pending_marketplace_offers_for_card
from models import Card, MarketplaceOffer, TradeOffer, User, utcnow

router = APIRouter()

_CARD_ID_PATH_PATTERN = re.compile(r"^FL-(\d{4})-(\d{6})$", re.IGNORECASE)


def _canonical_card_id(raw: str) -> str | None:
    s = (raw or "").strip()
    m = _CARD_ID_PATH_PATTERN.match(s)
    if not m:
        return None
    return f"FL-{m.group(1)}-{m.group(2)}"


def _resolve_card(db: Session, card_id_raw: str) -> Card:
    key = _canonical_card_id(card_id_raw)
    if key is None:
        raise HTTPException(status_code=404, detail="Card not found")
    card = get_card_by_card_id(db, key)
    if card is None:
        raise HTTPException(status_code=404, detail="Card not found")
    return card


def _animations_dir() -> Path:
    base = (os.environ.get("APP_DATA_DIR") or "").strip() or "./data"
    return Path(base).expanduser().resolve() / "animations"


def _animation_video_path(card: Card) -> Path | None:
    url = (card.animated_video_url or "").strip()
    if not url:
        return None
    name = Path(url).name
    if not name or not name.lower().endswith(".mp4"):
        return None
    path = _animations_dir() / name
    return path if path.is_file() else None


def _iso(dt) -> str | None:
    if dt is None:
        return None
    return dt.isoformat()


def _animation_status_payload(card: Card) -> dict:
    status = (card.animation_status or "pending").strip() or "pending"
    video_url = (card.animated_video_url or "").strip() or None
    return {
        "card_id": card.card_id,
        "status": status,
        "animation_status": status,
        "animated_video_url": video_url,
        "animation_motion": card.animation_motion,
        "animation_requested_at": _iso(card.animation_requested_at),
        "animation_completed_at": _iso(card.animation_completed_at),
        "can_retry": status == "failed",
    }


def _validate_animate_request(card: Card, current_user: User, motion_id: str) -> None:
    if card.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not own this card")
    if card.is_animated:
        raise HTTPException(status_code=400, detail="Card is already animated")
    st = card.animation_status
    if st is not None and st not in ("failed",):
        raise HTTPException(status_code=400, detail="Animation is already in progress for this card")
    if get_motion_by_id(motion_id) is None:
        raise HTTPException(status_code=400, detail="Invalid motion_id")
    if not is_motion_selectable(motion_id):
        raise HTTPException(
            status_code=400,
            detail="This motion is no longer available for new cards. Please choose a different motion.",
        )
    if (card.status or "active") not in ("active",):
        raise HTTPException(
            status_code=400,
            detail="Complete your order and add the card to your collection before animating.",
        )
    if not (card.image_url or "").strip():
        raise HTTPException(status_code=400, detail="Card has no image to animate")
    if _absolute_image_url(card.image_url) is None:
        raise HTTPException(status_code=400, detail="Card image URL is not valid for animation")


class AnimateBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    motion_id: str = Field(..., min_length=1, max_length=64)
    action_category: str | None = Field(default=None, max_length=32)


@router.get("/animation-motions")
def list_animation_motions():
    """Public list of motion options (no internal prompts)."""
    return list_motions_public()


@router.get("/generation-price")
def get_generation_price(tier: str = Query(..., min_length=1, max_length=40)):
    """Public pricing for card previews by order tier (no auth)."""
    return generation_price_payload(normalize_order_tier(tier))


@router.post("/{card_id}/animate")
def animate_card(
    card_id: str,
    body: AnimateBody,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = _resolve_card(db, card_id)
    _validate_animate_request(card, current_user, body.motion_id)

    now = utcnow()
    card.animation_status = "pending"
    card.animation_motion = body.motion_id
    if body.action_category:
        card.action_category = body.action_category.strip()
    else:
        from data.animation_motions import action_category_for_motion

        inferred = action_category_for_motion(body.motion_id)
        if inferred:
            card.action_category = inferred
    card.animation_requested_at = now
    card.animation_completed_at = None
    card.animated_video_url = None
    card.is_animated = False
    db.commit()

    background_tasks.add_task(process_animation, card.card_id, body.motion_id)
    return {"success": True, "card_id": card.card_id, "status": "pending"}


@router.post("/{card_id}/animate-upgrade")
def animate_card_upgrade(
    card_id: str,
    body: AnimateBody,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    source = _resolve_card(db, card_id)
    _validate_animate_request(source, current_user, body.motion_id)
    upgrade_price = animated_upgrade_price()
    if upgrade_price <= 0:
        upgrade_price = 10.00
    try:
        deduct_credits(
            user_id=current_user.id,
            amount=upgrade_price,
            transaction_type="animation",
            note=f"Animated card upgrade - {source.player_name}",
            db=db,
        )
    except InsufficientCreditsError as e:
        raise HTTPException(
            status_code=400,
            detail="Insufficient credits. Please add credits to your account at /credits",
        ) from e

    new_card = create_animated_upgrade_card(db, source=source, motion_id=body.motion_id)

    background_tasks.add_task(process_animation, new_card.card_id, body.motion_id)
    return {
        "success": True,
        "card_id": new_card.card_id,
        "source_card_id": source.card_id,
        "status": new_card.animation_status or "pending",
    }


@router.get("/{card_id}/animation-status")
def get_animation_status(
    card_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = _resolve_card(db, card_id)
    if card.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not own this card")
    return _animation_status_payload(card)


@router.get("/{card_id}/video")
def stream_card_video(
    card_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Stream animated card video — owners only."""
    card = _resolve_card(db, card_id)
    if card.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not own this card")
    if not card.is_animated:
        raise HTTPException(status_code=404, detail="This card is not animated")
    path = _animation_video_path(card)
    if path is None:
        raise HTTPException(status_code=404, detail="Animation file not found")
    return FileResponse(
        path,
        media_type="video/mp4",
        filename=f"{card.card_id}.mp4",
    )


def _validate_delete_request(card: Card, current_user: User) -> None:
    if card.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not own this card")
    if (card.status or "active") == "pending_trade":
        raise HTTPException(
            status_code=400,
            detail="This card cannot be deleted while a trade is in progress. Cancel the trade first.",
        )
    if card.listed_on_marketplace:
        raise HTTPException(
            status_code=400,
            detail="Remove this card from Free Agency Marketplace before deleting it.",
        )


@router.delete("/{card_id}")
def delete_card(
    card_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Permanently delete a card owned by the authenticated user."""
    card = _resolve_card(db, card_id)
    _validate_delete_request(card, current_user)

    deleted_id = card.card_id
    cancel_pending_marketplace_offers_for_card(db, card.card_id)
    db.query(MarketplaceOffer).filter(MarketplaceOffer.card_id == card.card_id).delete(
        synchronize_session=False
    )
    db.query(TradeOffer).filter(TradeOffer.card_id == card.id).delete(synchronize_session=False)
    db.delete(card)
    db.commit()
    return {"success": True, "card_id": deleted_id}
