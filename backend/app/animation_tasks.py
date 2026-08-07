"""Background processing for card animations."""

from __future__ import annotations

import logging

from card_repo import (
    animation_scenario_id_for_card,
    photo_notes_for_card,
    player_photo_url_for_card,
)
from data.animation_motions import get_motion_prompt
from database import SessionLocal
from email_service import (
    frontend_url,
    send_animation_complete_email,
    send_animation_failed_email,
)
from parent_email_utils import parent_email_for_notify
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

        motion_key = (card.animation_motion or motion_id or "").strip()
        if not motion_key:
            logger.error("process_animation: no motion on card %s", card_id)
            card.animation_status = "failed"
            db.commit()
            return

        photo_notes = photo_notes_for_card(card)
        scenario_id = animation_scenario_id_for_card(card)
        motion_prompt = get_motion_prompt(motion_key, photo_notes, scenario_id)
        if motion_prompt is None:
            logger.error(
                "process_animation: no Runway prompt for motion_id %s on card %s",
                motion_key,
                card_id,
            )
            card.animation_status = "failed"
            db.commit()
            return

        source_photo_url = player_photo_url_for_card(card)
        if not source_photo_url:
            logger.error("process_animation: no player photo URL for card %s", card_id)
            card.animation_status = "failed"
            db.commit()
            return

        card.animation_status = "processing"
        db.commit()

        logger.info(
            """
=== RUNWAY PROMPT ===
Card: %s
Motion: %s
Scenario: %s
User notes: %s
Final prompt (%d chars):
%s
====================
""",
            card_id,
            motion_key,
            scenario_id or "none",
            photo_notes or "none",
            len(motion_prompt),
            motion_prompt,
        )
        result = await generate_animation(source_photo_url, motion_prompt, card_id)

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
                    parent_email=parent_email_for_notify(owner),
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
                parent_email=parent_email_for_notify(owner),
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
