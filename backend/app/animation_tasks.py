"""Background processing for card animations."""

from __future__ import annotations

import logging

from data.animation_motions import get_motion_by_id
from database import SessionLocal
from email_service import (
    frontend_url,
    send_animation_complete_email,
    send_animation_failed_email,
)
from models import Card, User, utcnow
from services.runway_service import generate_animation

logger = logging.getLogger(__name__)


async def process_animation(card_id: str, motion_id: str) -> None:
    """Run Runway generation and update card row; notify owner on success/failure."""
    db = SessionLocal()
    try:
        card = db.query(Card).filter(Card.card_id == card_id).first()
        if card is None:
            logger.error("process_animation: card not found %s", card_id)
            return

        motion = get_motion_by_id(motion_id)
        if motion is None:
            logger.error("process_animation: unknown motion_id %s for card %s", motion_id, card_id)
            card.animation_status = "failed"
            db.commit()
            return

        card.animation_status = "processing"
        db.commit()

        result = await generate_animation(card.image_url, motion["prompt"], card_id)

        owner = db.query(User).filter(User.id == card.owner_id).first()
        player_name = card.player_name or "your card"

        if result.get("success") and result.get("video_url"):
            card.is_animated = True
            card.animated_video_url = result["video_url"]
            card.animation_status = "completed"
            card.animation_completed_at = utcnow()
            db.commit()
            logger.info("Animation completed for card %s", card_id)
            if owner and owner.email:
                send_animation_complete_email(
                    owner.email,
                    owner.display_name,
                    player_name,
                    f"{frontend_url()}/card/{card.card_id}",
                    card_id,
                )
            return

        card.is_animated = False
        card.animated_video_url = None
        card.animation_status = "failed"
        db.commit()
        err = result.get("error") or "Generation failed"
        logger.error("Animation failed for card %s after retries: %s", card_id, err)
        if owner and owner.email:
            send_animation_failed_email(
                owner.email,
                owner.display_name,
                player_name,
                f"{frontend_url()}/my-collection",
                card_id,
            )
    except Exception:
        logger.exception("process_animation crashed for card %s", card_id)
        db.rollback()
        try:
            card = db.query(Card).filter(Card.card_id == card_id).first()
            if card:
                card.is_animated = False
                card.animated_video_url = None
                card.animation_status = "failed"
                db.commit()
        except Exception:
            logger.exception("Could not mark card %s animation as failed", card_id)
    finally:
        db.close()
