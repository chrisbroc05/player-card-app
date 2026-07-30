"""Background processing for highlight card videos."""

from __future__ import annotations

import logging
from pathlib import Path

from card_pricing import highlight_card_price
from credit_service import TX_HIGHLIGHT, TX_REFUND, add_credits
from database import SessionLocal
from email_service import (
    frontend_url,
    send_highlight_complete_email,
    send_highlight_failed_email,
)
from highlight_service import extract_highlight_thumbnail, process_highlight_upload
from highlight_video_utils import validate_highlight_duration
from models import Card, User, utcnow
from parent_email_utils import parent_email_for_notify

logger = logging.getLogger(__name__)


def run_highlight_processing(
    card_id: str,
    raw_path: str,
    final_path: str,
    thumb_path: str,
    *,
    trim_start: float,
    trim_end: float,
    user_id: int,
) -> None:
    """Trim highlight clip, save assets, notify owner; refund on failure."""
    db = SessionLocal()
    raw = Path(raw_path)
    final = Path(final_path)
    thumb = Path(thumb_path)
    price = highlight_card_price()
    owner_email = ""
    owner_name = ""
    player_name = "your card"
    parent_email = None

    try:
        card = db.query(Card).filter(Card.card_id == card_id).first()
        if card is None:
            logger.error("run_highlight_processing: card not found %s", card_id)
            return

        owner = db.query(User).filter(User.id == user_id).first()
        if owner:
            owner_email = owner.email or ""
            owner_name = owner.display_name or ""
            parent_email = parent_email_for_notify(owner)
        player_name = card.player_name or "your card"

        ok, was_trimmed = process_highlight_upload(raw, final, trim_start=trim_start, trim_end=trim_end)
        if not ok:
            raise RuntimeError("Could not process highlight video.")
        if was_trimmed:
            validate_highlight_duration(final)

        thumb_public_url = None
        if extract_highlight_thumbnail(final, thumb, at_seconds=trim_start):
            thumb_public_url = f"/highlights/thumbnails/{thumb.name}"

        public_url = f"/highlights/{final.name}"
        now = utcnow()
        card.is_highlight = True
        card.highlight_video_url = public_url
        card.highlight_thumbnail_url = thumb_public_url
        card.highlight_trim_start = round(trim_start, 3)
        card.highlight_trim_end = round(trim_end, 3)
        card.highlight_status = "completed"
        card.highlight_uploaded_at = now
        db.commit()
        logger.info("Highlight completed for card %s", card_id)

        if owner_email:
            image_for_email = thumb_public_url or card.image_url
            send_highlight_complete_email(
                owner_email,
                owner_name,
                player_name,
                f"{frontend_url()}/card/{card.card_id}",
                card_id,
                image_for_email,
                parent_email=parent_email,
            )
    except Exception as exc:
        logger.exception("Highlight processing failed for card %s: %s", card_id, exc)
        db.rollback()
        try:
            card = db.query(Card).filter(Card.card_id == card_id).first()
            if card:
                card.highlight_status = "failed"
                card.highlight_video_url = None
                card.highlight_thumbnail_url = None
                db.commit()
            add_credits(
                user_id,
                price,
                TX_REFUND,
                reference_id=card_id,
                note=f"Refund: highlight processing failed for {card_id}",
                db=db,
            )
            db.commit()
            if owner_email:
                send_highlight_failed_email(
                    owner_email,
                    owner_name,
                    player_name,
                    f"{frontend_url()}/my-collection",
                    card_id,
                    price,
                    parent_email=parent_email,
                )
        except Exception:
            logger.exception("Could not finalize highlight failure for card %s", card_id)
            db.rollback()
        if final.is_file():
            final.unlink(missing_ok=True)
        if thumb.is_file():
            thumb.unlink(missing_ok=True)
    finally:
        raw.unlink(missing_ok=True)
        db.close()
