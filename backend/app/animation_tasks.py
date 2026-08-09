"""Background processing for card animations."""

from __future__ import annotations

import logging

from card_repo import (
    action_category_for_card,
    animation_scenario_id_for_card,
    batting_side_for_card,
    photo_notes_for_card,
    player_photo_url_for_card,
    throwing_hand_for_card,
)
from credit_service import refund_animation_credits
from data.animation_motions import get_motion_prompt
from database import SessionLocal
from email_service import (
    frontend_url,
    send_animation_complete_email,
    send_animation_failed_email,
)
from parent_email_utils import parent_email_for_notify
from models import Card, User, utcnow
from services.video_generation_service import generate_animation

logger = logging.getLogger(__name__)


def _mark_animation_failed(db, card: Card | None) -> None:
    if card is None:
        return
    card.is_animated = False
    card.animated_video_url = None
    card.animation_status = "failed"
    db.commit()


def _notify_animation_failed(owner: User | None, card: Card | None, card_id: str) -> None:
    if not owner or not owner.email or card is None:
        return
    send_animation_failed_email(
        owner.email,
        owner.display_name,
        card.player_name or "your card",
        f"{frontend_url()}/my-collection",
        card_id,
        parent_email=parent_email_for_notify(owner),
    )


async def process_animation(card_id: str, motion_id: str) -> None:
    """Generate animated video; refund credits and mark failed on any error."""
    db = SessionLocal()
    card: Card | None = None
    owner: User | None = None
    player_name = "your card"

    try:
        card = db.query(Card).filter(Card.card_id == card_id).first()
        if card is None:
            logger.error("process_animation: card not found %s", card_id)
            return

        owner = db.query(User).filter(User.id == card.owner_id).first() if card.owner_id else None
        player_name = card.player_name or player_name

        motion_key = (card.animation_motion or motion_id or "").strip()
        if not motion_key:
            raise RuntimeError(f"No animation motion configured for card {card_id}")

        photo_notes = photo_notes_for_card(card)
        scenario_id = animation_scenario_id_for_card(card)
        category = action_category_for_card(card)
        throwing_hand = throwing_hand_for_card(card)
        batting_side = batting_side_for_card(card)
        motion_prompt = get_motion_prompt(
            motion_key,
            photo_notes,
            scenario_id,
            action_category=category,
            throwing_hand=throwing_hand,
            batting_side=batting_side,
        )
        if motion_prompt is None:
            raise RuntimeError(f"No video prompt for motion_id {motion_key} on card {card_id}")

        source_photo_url = player_photo_url_for_card(card)
        if not source_photo_url:
            raise RuntimeError(f"No player photo URL for card {card_id}")

        card.animation_status = "processing"
        db.commit()

        logger.info("=== KLING PROMPT ===")
        logger.info("Category: %s", category or "none")
        logger.info("Scenario: %s", scenario_id or "none")
        logger.info("Throwing hand: %s", throwing_hand or "none")
        logger.info("Batting side: %s", batting_side or "none")
        logger.info("Motion: %s", motion_key)
        logger.info("Prompt: %s", motion_prompt)
        logger.info("===================")

        result = await generate_animation(source_photo_url, motion_prompt, card_id)
        if not result.get("success") or not result.get("video_url"):
            err = result.get("error") or "Generation failed"
            raise RuntimeError(err)

        card.is_animated = True
        card.animated_video_url = result["video_url"]
        card.animation_status = "completed"
        card.animation_completed_at = utcnow()
        card.animation_model_used = result.get("model_used")
        db.commit()
        logger.info(
            "Animation completed for card %s (provider=%s model=%s)",
            card_id,
            result.get("provider") or "unknown",
            result.get("model_used") or "unknown",
        )
        if owner and owner.email:
            send_animation_complete_email(
                owner.email,
                owner.display_name,
                player_name,
                f"{frontend_url()}/card/{card.card_id}",
                card_id,
                parent_email=parent_email_for_notify(owner),
            )

    except Exception as exc:
        logger.error("Animation failed for %s: %s", card_id, exc)
        db.rollback()
        try:
            card = db.query(Card).filter(Card.card_id == card_id).first()
            if card and card.owner_id:
                owner = db.query(User).filter(User.id == card.owner_id).first()
                try:
                    refund_animation_credits(db, card.owner_id, card_id)
                except Exception as refund_error:
                    logger.error("Refund also failed for %s: %s", card_id, refund_error)
            _mark_animation_failed(db, card)
            _notify_animation_failed(owner, card, card_id)
        except Exception:
            logger.exception("Could not finalize failed animation for card %s", card_id)
            db.rollback()
    finally:
        db.close()
