"""Scheduled marketplace maintenance (listing + offer expiration)."""

from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from card_repo import get_card_by_card_id
from database import SessionLocal
from email_service import (
    frontend_url,
    send_marketplace_listing_expired_email,
    send_marketplace_offer_expired_buyer_email,
)
from marketplace_repo import (
    cancel_pending_marketplace_offers_for_card,
    clear_marketplace_listing,
    float_from_decimal,
)
from models import Card, MarketplaceOffer, User, utcnow

logger = logging.getLogger(__name__)


def run_marketplace_expiration_pass() -> None:
    """Expire stale listings and pending offers; notify owners/buyers."""
    db = SessionLocal()
    try:
        now = utcnow()
        _expire_listings(db, now)
        _expire_offers(db, now)
    except Exception:
        logger.exception("Marketplace expiration job failed")
        db.rollback()
    finally:
        db.close()


def _expire_listings(db: Session, now) -> None:
    rows = (
        db.query(Card)
        .filter(
            Card.listed_on_marketplace.is_(True),
            Card.listing_expires_at.isnot(None),
            Card.listing_expires_at < now,
        )
        .all()
    )
    n = 0
    for card in rows:
        owner = db.query(User).filter(User.id == card.owner_id).first()
        cancel_pending_marketplace_offers_for_card(db, card.card_id)
        clear_marketplace_listing(card)
        n += 1
        if owner and owner.email:
            try:
                send_marketplace_listing_expired_email(
                    owner.email,
                    owner.display_name,
                    card.player_name,
                    f"{frontend_url()}/my-collection",
                )
            except Exception:
                logger.exception("Listing expired email failed for card %s", card.card_id)
    if n:
        db.commit()
    logger.info("Marketplace expiration: %s listing(s) removed", n)


def _expire_offers(db: Session, now) -> None:
    pending = (
        db.query(MarketplaceOffer)
        .filter(
            MarketplaceOffer.status == "pending",
            MarketplaceOffer.expires_at.isnot(None),
            MarketplaceOffer.expires_at < now,
        )
        .all()
    )
    n = 0
    for offer in pending:
        offer.status = "expired"
        offer.updated_at = now
        card = get_card_by_card_id(db, offer.card_id)
        buyer = db.query(User).filter(User.id == offer.buyer_id).first()
        n += 1
        if buyer and buyer.email and card:
            try:
                send_marketplace_offer_expired_buyer_email(
                    buyer.email,
                    buyer.display_name,
                    card.player_name,
                    float_from_decimal(offer.offer_amount),
                    f"{frontend_url()}/marketplace",
                    offer.id,
                )
            except Exception:
                logger.exception("Offer expired email failed for offer %s", offer.id)
    if n:
        db.commit()
    logger.info("Marketplace expiration: %s offer(s) marked expired", n)
