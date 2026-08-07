"""Card animation routes (Runway ML)."""

from __future__ import annotations

import logging
import os
import re
import tempfile
import traceback
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from animation_tasks import process_animation
from card_pricing import animated_studio_total_price, animated_upgrade_price, generation_price_payload, highlight_card_price, normalize_order_tier
from auth import get_current_user
from card_repo import create_animated_upgrade_card, get_card_by_card_id, card_to_dict, highlight_fields_for_card, player_photo_url_for_card
from credit_service import (
    InsufficientCreditsError,
    TX_ANIMATION,
    TX_HIGHLIGHT,
    TX_REFUND,
    add_credits,
    deduct_credits,
    get_balance,
    highlight_charge_to_refund,
)
from highlight_service import MAX_HIGHLIGHT_UPLOAD_BYTES, validate_trim_range, validate_upload_duration
from highlight_video_utils import video_extension_for_content_type
from config.motion_scenarios import list_scenarios_for_motion, motion_has_scenarios
from data.animation_motions import get_motion_by_id, is_motion_selectable, list_motions_public
from database import get_db
from email_service import _absolute_image_url, frontend_url, send_highlight_complete_email
from marketplace_repo import cancel_pending_marketplace_offers_for_card
from parent_email_utils import parent_email_for_notify
from models import Card, MarketplaceOffer, TradeOffer, User, utcnow
from utils.storage import content_type_for_filename, save_bytes_to_storage

router = APIRouter()
logger = logging.getLogger(__name__)

HIGHLIGHT_UPLOAD_USER_MESSAGE = (
    "Video upload failed. Your credits have not been charged. Please try again."
)

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


def _highlights_dir() -> Path:
    base = (os.environ.get("APP_DATA_DIR") or "").strip() or "./data"
    path = Path(base).expanduser().resolve() / "highlights"
    path.mkdir(parents=True, exist_ok=True)
    (path / "thumbnails").mkdir(parents=True, exist_ok=True)
    return path


def _is_failed_highlight_card(card: Card) -> bool:
    video_url = (card.highlight_video_url or "").strip()
    status = (card.highlight_status or "").strip().lower()
    image_url = (card.image_url or "").strip().lower()
    if status == "failed":
        return True
    if card.is_highlight and not video_url:
        return True
    if "highlight-placeholder" in image_url and not video_url:
        return True
    return False


def _delete_owned_card(db: Session, card: Card) -> str:
    deleted_id = card.card_id
    cancel_pending_marketplace_offers_for_card(db, card.card_id)
    db.query(MarketplaceOffer).filter(MarketplaceOffer.card_id == card.card_id).delete(
        synchronize_session=False
    )
    db.query(TradeOffer).filter(TradeOffer.card_id == card.id).delete(synchronize_session=False)
    db.delete(card)
    return deleted_id


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


def _validate_animate_request(
    card: Card,
    current_user: User,
    motion_id: str,
    *,
    allow_preview: bool = False,
) -> None:
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
    allowed_statuses = ("active", "preview") if allow_preview else ("active",)
    if (card.status or "active") not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Complete your order and add the card to your collection before animating.",
        )
    if not player_photo_url_for_card(card):
        raise HTTPException(status_code=400, detail="Card has no player photo to animate")
    photo_url = player_photo_url_for_card(card)
    if _absolute_image_url(photo_url) is None:
        raise HTTPException(status_code=400, detail="Player photo URL is not valid for animation")


class AnimateBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    motion_id: str = Field(..., min_length=1, max_length=64)
    action_category: str | None = Field(default=None, max_length=32)


class StudioAnimateBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    motion_id: str = Field(..., min_length=1, max_length=64)
    action_category: str | None = Field(default=None, max_length=32)
    quantity: int = Field(default=1, ge=1, le=10)


@router.get("/animation-motions")
def list_animation_motions():
    """Public list of motion options (no internal prompts)."""
    return list_motions_public()


@router.get("/animation-scenarios")
def list_animation_scenarios(motion_id: str = Query(..., min_length=1, max_length=64)):
    """Public scenario options for a motion (no prompt_context)."""
    if not motion_has_scenarios(motion_id):
        return []
    return list_scenarios_for_motion(motion_id)


@router.get("/generation-price")
def get_generation_price(tier: str = Query(..., min_length=1, max_length=40)):
    """Public pricing for card previews by order tier (no auth)."""
    return generation_price_payload(normalize_order_tier(tier))


@router.get("/generation-usage")
def get_generation_usage(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Authenticated user's card generation usage vs daily/monthly caps."""
    from utils.usage import generation_usage_payload

    return generation_usage_payload(db, current_user.id)


def _enforce_generation_cap(db: Session, user_id: int):
    from utils.usage import require_generation_capacity

    blocked = require_generation_capacity(db, user_id)
    if blocked is not None:
        return blocked
    return None


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

    if (blocked := _enforce_generation_cap(db, current_user.id)) is not None:
        return blocked

    _apply_motion_to_card(card, body.motion_id, body.action_category)
    db.commit()

    background_tasks.add_task(process_animation, card.card_id, body.motion_id)
    return {"success": True, "card_id": card.card_id, "status": "pending"}


def _apply_motion_to_card(card: Card, motion_id: str, action_category: str | None) -> None:
    now = utcnow()
    card.animation_status = "pending"
    card.animation_motion = motion_id
    if action_category:
        card.action_category = action_category.strip()
    else:
        from data.animation_motions import action_category_for_motion

        inferred = action_category_for_motion(motion_id)
        if inferred:
            card.action_category = inferred
    card.animation_requested_at = now
    card.animation_completed_at = None
    card.animated_video_url = None
    card.is_animated = False


@router.post("/{card_id}/start-studio-animation")
def start_studio_animation(
    card_id: str,
    body: StudioAnimateBody,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Charge for animated studio upgrade (base + optional copies) and start animation job(s).
    Called after the user confirms quantity on the static preview popup.
    """
    card = _resolve_card(db, card_id)
    _validate_animate_request(card, current_user, body.motion_id, allow_preview=True)

    if (blocked := _enforce_generation_cap(db, current_user.id)) is not None:
        return blocked

    pricing = animated_studio_total_price(body.quantity)
    try:
        deduct_credits(
            user_id=current_user.id,
            amount=pricing["total"],
            transaction_type=TX_ANIMATION,
            reference_id=card.card_id,
            note=(
                f"Animated card studio ×{pricing['quantity']} - {card.player_name} "
                f"(${pricing['total']:.2f})"
            ),
            db=db,
        )
    except InsufficientCreditsError as e:
        raise HTTPException(
            status_code=400,
            detail="Insufficient credits. Please add credits to your account at /credits",
        ) from e

    additional_ids: list[str] = []
    for _ in range(max(0, body.quantity - 1)):
        extra = create_animated_upgrade_card(
            db,
            source=card,
            motion_id=body.motion_id,
            action_category=body.action_category,
        )
        additional_ids.append(extra.card_id)
        background_tasks.add_task(process_animation, extra.card_id, body.motion_id)

    _apply_motion_to_card(card, body.motion_id, body.action_category)
    db.commit()

    background_tasks.add_task(process_animation, card.card_id, body.motion_id)
    return {
        "success": True,
        "card_id": card.card_id,
        "additional_card_ids": additional_ids,
        "quantity": pricing["quantity"],
        "amount_charged": pricing["total"],
        "pricing": pricing,
        "status": "pending",
    }


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

    if (blocked := _enforce_generation_cap(db, current_user.id)) is not None:
        return blocked

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


@router.get("/{card_id}/highlight-status")
def get_highlight_status(
    card_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = _resolve_card(db, card_id)
    if card.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not own this card")
    return highlight_fields_for_card(card)


@router.post("/{card_id}/highlight")
async def upload_card_highlight(
    card_id: str,
    file: UploadFile = File(..., description="Highlight video (MP4, MOV, AVI, or WebM)"),
    trim_start_seconds: float = Form(0),
    trim_end_seconds: float | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save highlight video immediately — no server-side transcoding."""
    tmp_path: Path | None = None
    charged = False
    price = highlight_card_price()

    try:
        card = _resolve_card(db, card_id)
        if card.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="You do not own this card")
        if card.is_animated:
            raise HTTPException(status_code=400, detail="Animated cards cannot use highlight upload")
        if card.highlight_status == "processing":
            raise HTTPException(status_code=409, detail="Highlight video is already processing for this card")
        if card.is_highlight and (card.highlight_video_url or "").strip() and card.highlight_status == "completed":
            raise HTTPException(status_code=400, detail="Highlight video is already uploaded for this card")

        if (blocked := _enforce_generation_cap(db, current_user.id)) is not None:
            return blocked

        ext = video_extension_for_content_type(file.content_type, file.filename)
        if ext is None:
            raise HTTPException(
                status_code=400,
                detail="Only video uploads are allowed (MP4, MOV, AVI, or WebM).",
            )

        data = await file.read()
        if not data:
            raise HTTPException(status_code=400, detail="Empty file.")
        if len(data) > MAX_HIGHLIGHT_UPLOAD_BYTES:
            raise HTTPException(status_code=400, detail="Video file is too large (max 100 MB).")

        safe_id = card.card_id.replace("/", "_")
        out_filename = f"{safe_id}{ext}"

        if get_balance(db, current_user.id) < price:
            raise HTTPException(
                status_code=402,
                detail="Insufficient credit balance for the highlight upgrade.",
            )

        try:
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                tmp.write(data)
                tmp_path = Path(tmp.name)
            source_duration = validate_upload_duration(tmp_path)
        except ValueError as exc:
            if tmp_path is not None:
                tmp_path.unlink(missing_ok=True)
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        trim_start = max(0.0, float(trim_start_seconds or 0))
        if trim_end_seconds is not None:
            trim_end_raw = float(trim_end_seconds)
        elif source_duration is not None:
            trim_end_raw = min(source_duration, trim_start + 10.0)
        else:
            trim_end_raw = trim_start + 10.0
        if trim_end_raw <= trim_start:
            trim_end_raw = (source_duration if source_duration else trim_start + 10.0)

        trim_start, trim_end = validate_trim_range(
            trim_start=trim_start,
            trim_end=trim_end_raw,
            source_duration=source_duration,
        )

        try:
            deduct_credits(
                user_id=current_user.id,
                amount=price,
                transaction_type=TX_HIGHLIGHT,
                reference_id=card.card_id,
                note=f"Highlight video upgrade for {card.card_id}",
                db=db,
                commit=False,
            )
            charged = True
        except InsufficientCreditsError as exc:
            if tmp_path is not None:
                tmp_path.unlink(missing_ok=True)
            raise HTTPException(status_code=402, detail=str(exc)) from exc

        upload_content_type = content_type_for_filename(out_filename, file.content_type or "video/mp4")
        public_url = save_bytes_to_storage(
            data,
            r2_key=f"highlights/{out_filename}",
            content_type=upload_content_type,
            local_dir=_highlights_dir(),
            local_url_prefix="/highlights",
        )
        if tmp_path is not None:
            tmp_path.unlink(missing_ok=True)
        now = utcnow()
        card.is_highlight = True
        card.highlight_video_url = public_url
        card.highlight_thumbnail_url = None
        card.highlight_trim_start = round(trim_start, 3)
        card.highlight_trim_end = round(trim_end, 3) if trim_end is not None else None
        card.highlight_status = "completed"
        card.highlight_uploaded_at = now
        db.commit()
        db.refresh(card)
        charged = False

        owner_email = current_user.email or ""
        owner_name = current_user.display_name or ""
        parent_email = parent_email_for_notify(current_user)
        if owner_email:
            try:
                send_highlight_complete_email(
                    owner_email,
                    owner_name,
                    card.player_name or "your card",
                    f"{frontend_url()}/card/{card.card_id}",
                    card.card_id,
                    card.image_url,
                    parent_email=parent_email,
                )
            except Exception:
                pass

        return card_to_dict(card, db)
    except HTTPException:
        db.rollback()
        if tmp_path is not None and tmp_path.is_file() and not charged:
            tmp_path.unlink(missing_ok=True)
        raise
    except ValueError as exc:
        db.rollback()
        if tmp_path is not None and tmp_path.is_file():
            tmp_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        if tmp_path is not None and tmp_path.is_file():
            tmp_path.unlink(missing_ok=True)
        logger.error("Highlight upload error for %s: %s", card_id, traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={
                "detail": {
                    "message": HIGHLIGHT_UPLOAD_USER_MESSAGE,
                    "error": str(exc),
                    "traceback": traceback.format_exc(),
                }
            },
        )


@router.delete("/{card_id}/highlight-cleanup")
def cleanup_failed_highlight_card(
    card_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a failed highlight card and refund any highlight charges."""
    card = _resolve_card(db, card_id)
    if card.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not own this card")
    if not _is_failed_highlight_card(card):
        raise HTTPException(status_code=400, detail="This card is not a failed highlight upload.")

    refund_amount = highlight_charge_to_refund(db, current_user.id, card.card_id)
    deleted_id = _delete_owned_card(db, card)
    if refund_amount > 0:
        add_credits(
            user_id=current_user.id,
            amount=refund_amount,
            transaction_type=TX_REFUND,
            reference_id=deleted_id,
            note=f"Refund for failed highlight upload ({deleted_id})",
            db=db,
        )
    db.commit()
    return {
        "success": True,
        "card_id": deleted_id,
        "refunded": float(refund_amount),
    }


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
    video_url = (card.animated_video_url or "").strip()
    if video_url.startswith("http://") or video_url.startswith("https://"):
        return RedirectResponse(video_url)
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

    deleted_id = _delete_owned_card(db, card)
    db.commit()
    return {"success": True, "card_id": deleted_id}
