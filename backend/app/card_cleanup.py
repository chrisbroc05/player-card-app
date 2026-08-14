"""Soft delete, recovery, and permanent card cleanup (R2 + database)."""

from __future__ import annotations

import logging
import os
from datetime import timedelta
from urllib.parse import urlparse

from sqlalchemy.orm import Session

from marketplace_repo import cancel_pending_marketplace_offers_for_card, clear_marketplace_listing
from models import Card, MarketplaceOffer, TradeOffer, utcnow
from utils.storage import R2_PUBLIC_URL, delete_file_from_r2, is_r2_public_url

logger = logging.getLogger(__name__)

RECOVERY_DAYS = 30


def extract_r2_key(url: str | None) -> str | None:
    s = (url or "").strip()
    if not s:
        return None
    base = (R2_PUBLIC_URL or os.environ.get("R2_PUBLIC_URL") or "").rstrip("/")
    if base and s.startswith(f"{base}/"):
        return s[len(base) + 1 :]
    if is_r2_public_url(s):
        path = urlparse(s).path.lstrip("/")
        return path or None
    return None


def delete_card_media_from_r2(card: Card) -> None:
    for url_field in (
        card.image_url,
        card.animated_video_url,
        card.highlight_video_url,
        card.player_photo_url,
        card.face_photo_url,
        card.highlight_thumbnail_url,
    ):
        key = extract_r2_key(url_field)
        if not key:
            continue
        try:
            delete_file_from_r2(key)
            logger.info("Permanently deleted R2 file: %s", key)
        except Exception as e:
            logger.warning("R2 cleanup failed for %s: %s", key, e)


def cancel_pending_trades_for_card(db: Session, card: Card) -> int:
    pending = (
        db.query(TradeOffer)
        .filter(TradeOffer.card_id == card.id, TradeOffer.status == "pending")
        .all()
    )
    for trade in pending:
        trade.status = "cancelled"
        logger.info("Auto-cancelled trade %s for deleted card %s", trade.id, card.card_id)
    return len(pending)


def soft_delete_owned_card(db: Session, card: Card):
    """Hide card from collection; recoverable for RECOVERY_DAYS."""
    if card.listed_on_marketplace:
        cancel_pending_marketplace_offers_for_card(db, card.card_id, commit=False)
        clear_marketplace_listing(card)
        logger.info("Auto-unlisted card %s before deletion", card.card_id)

    cancel_pending_trades_for_card(db, card)
    card.trade_offered_to = None

    now = utcnow()
    card.status = "deleted"
    card.deleted_at = now
    card.permanently_deleted = False
    recoverable_until = now + timedelta(days=RECOVERY_DAYS)
    logger.info(
        "Soft deleted card %s for user %s — recoverable until %s",
        card.card_id,
        card.owner_id,
        recoverable_until.isoformat(),
    )
    return now, recoverable_until


def permanently_delete_card(db: Session, card: Card) -> str:
    """Remove card media from R2 and delete the database row."""
    deleted_id = card.card_id
    cancel_pending_marketplace_offers_for_card(db, card.card_id, commit=False)
    db.query(MarketplaceOffer).filter(MarketplaceOffer.card_id == card.card_id).delete(
        synchronize_session=False
    )
    db.query(TradeOffer).filter(TradeOffer.card_id == card.id).delete(synchronize_session=False)
    delete_card_media_from_r2(card)
    db.delete(card)
    logger.info("Permanently deleted card %s", deleted_id)
    return deleted_id


def cleanup_expired_deleted_cards(db: Session) -> int:
    """Permanently delete cards soft-deleted more than RECOVERY_DAYS ago."""
    expiry_threshold = utcnow() - timedelta(days=RECOVERY_DAYS)
    expired_cards = (
        db.query(Card)
        .filter(
            Card.status == "deleted",
            Card.deleted_at.isnot(None),
            Card.deleted_at < expiry_threshold,
            Card.permanently_deleted.is_(False),
        )
        .all()
    )
    logger.info("Cleanup job: found %s cards to permanently delete", len(expired_cards))
    deleted_count = 0
    for card in expired_cards:
        try:
            card.permanently_deleted = True
            db.flush()
            permanently_delete_card(db, card)
            db.commit()
            deleted_count += 1
        except Exception as e:
            db.rollback()
            logger.error("Failed to cleanup card %s: %s", card.card_id, e)
    logger.info("Cleanup job complete: permanently deleted %s expired cards", deleted_count)
    return deleted_count


def run_deleted_cards_cleanup_pass() -> None:
    from database import SessionLocal

    db = SessionLocal()
    try:
        cleanup_expired_deleted_cards(db)
    except Exception:
        logger.exception("Deleted cards cleanup job failed")
        db.rollback()
    finally:
        db.close()
