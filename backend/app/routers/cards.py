"""Card animation routes (Runway ML)."""

from __future__ import annotations

import re

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from animation_tasks import process_animation
from auth import get_current_user
from card_repo import create_animated_upgrade_card, get_card_by_card_id
from data.animation_motions import get_motion_by_id, list_motions_public
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


def _iso(dt) -> str | None:
    if dt is None:
        return None
    return dt.isoformat()


def _animation_status_payload(card: Card) -> dict:
    return {
        "card_id": card.card_id,
        "animation_status": card.animation_status,
        "animated_video_url": card.animated_video_url,
        "animation_motion": card.animation_motion,
        "animation_requested_at": _iso(card.animation_requested_at),
        "animation_completed_at": _iso(card.animation_completed_at),
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


@router.get("/animation-motions")
def list_animation_motions():
    """Public list of motion options (no internal prompts)."""
    return list_motions_public()


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
    # TODO: Gate this endpoint behind payment (ANIMATED_CARD_PRICE) when billing is integrated.
    source = _resolve_card(db, card_id)
    _validate_animate_request(source, current_user, body.motion_id)

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
            detail="Remove this card from Free Agency before deleting it.",
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
