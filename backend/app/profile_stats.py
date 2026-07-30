"""Profile KPI queries — kept in sync with GET /cards/my-cards collection rules."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from sqlalchemy import func
from sqlalchemy.orm import Session

from card_repo import cards_created_by_user_filter, owned_collection_filter
from marketplace_repo import float_from_decimal
from models import Card, MarketplaceOffer, TradeOffer, User

logger = logging.getLogger(__name__)


@dataclass
class ProfileKpiSnapshot:
    total_cards_owned: int
    total_cards_ever_created: int
    cards_traded_away: int
    cards_received_via_trade: int
    animated_cards_owned: int
    highlight_cards_owned: int
    total_print_run_copies: int
    favorite_tier: str | None
    rarest_card: Card | None
    total_spent: float
    total_earned: float
    total_offers_made: int
    active_listings: int
    top_purchase: MarketplaceOffer | None
    top_sale: MarketplaceOffer | None


def _tier_display(db_tier: str) -> str:
    t = (db_tier or "").lower().replace("-", "_")
    if t == "rookie":
        return "Rookie"
    if t in ("allstar", "all_star"):
        return "All-Star"
    if t == "legends":
        return "Legends"
    return db_tier or "Unknown"


def compute_profile_kpis(db: Session, user: User) -> ProfileKpiSnapshot:
    uid = user.id
    collection_f = owned_collection_filter(uid)
    created_f = cards_created_by_user_filter(uid)

    total_cards_owned = int(db.query(func.count(Card.id)).filter(collection_f).scalar() or 0)

    total_cards_ever_created = int(db.query(func.count(Card.id)).filter(created_f).scalar() or 0)

    cards_traded_away = int(
        db.query(func.count(TradeOffer.id))
        .filter(TradeOffer.sender_id == uid, TradeOffer.status == "accepted")
        .scalar()
        or 0
    )

    cards_received_via_trade = int(
        db.query(func.count(TradeOffer.id))
        .filter(TradeOffer.recipient_id == uid, TradeOffer.status == "accepted")
        .scalar()
        or 0
    )

    animated_cards_owned = int(
        db.query(func.count(Card.id))
        .filter(
            collection_f,
            Card.is_animated.is_(True),
        )
        .scalar()
        or 0
    )

    highlight_cards_owned = int(
        db.query(func.count(Card.id))
        .filter(
            collection_f,
            Card.is_highlight.is_(True),
            Card.highlight_status == "completed",
        )
        .scalar()
        or 0
    )

    total_print_run_copies = int(
        db.query(func.coalesce(func.sum(Card.print_run), 0)).filter(created_f).scalar() or 0
    )

    tier_row = (
        db.query(Card.tier, func.count(Card.id).label("cnt"))
        .filter(created_f)
        .group_by(Card.tier)
        .order_by(func.count(Card.id).desc())
        .first()
    )
    favorite_tier: str | None = None
    if tier_row and int(tier_row[1] or 0) > 0:
        favorite_tier = _tier_display(str(tier_row[0]))

    rarest: Card | None = (
        db.query(Card)
        .filter(collection_f)
        .order_by(Card.print_run.asc(), Card.edition_number.asc(), Card.created_at.asc())
        .first()
    )

    total_spent = float_from_decimal(
        db.query(func.coalesce(func.sum(MarketplaceOffer.offer_amount), 0))
        .filter(MarketplaceOffer.buyer_id == uid, MarketplaceOffer.status == "accepted")
        .scalar()
    )

    total_earned = float_from_decimal(
        db.query(func.coalesce(func.sum(MarketplaceOffer.offer_amount), 0))
        .filter(MarketplaceOffer.seller_id == uid, MarketplaceOffer.status == "accepted")
        .scalar()
    )

    total_offers_made = int(
        db.query(func.count(MarketplaceOffer.id))
        .filter(
            MarketplaceOffer.buyer_id == uid,
            MarketplaceOffer.status == "accepted",
        )
        .scalar()
        or 0
    )

    active_listings = int(
        db.query(func.count(Card.id))
        .filter(collection_f, Card.listed_on_marketplace.is_(True))
        .scalar()
        or 0
    )

    top_purchase = (
        db.query(MarketplaceOffer)
        .filter(MarketplaceOffer.buyer_id == uid, MarketplaceOffer.status == "accepted")
        .order_by(MarketplaceOffer.offer_amount.desc())
        .first()
    )

    top_sale = (
        db.query(MarketplaceOffer)
        .filter(MarketplaceOffer.seller_id == uid, MarketplaceOffer.status == "accepted")
        .order_by(MarketplaceOffer.offer_amount.desc())
        .first()
    )

    logger.info(
        "profile_kpis user_id=%s email=%s total_cards_owned=%s total_cards_ever_created=%s "
        "cards_traded_away=%s cards_received_via_trade=%s animated_cards_owned=%s "
        "total_print_run_copies=%s favorite_tier=%s rarest_card_id=%s "
        "marketplace_spent=%s marketplace_earned=%s accepted_offers_made=%s active_listings=%s",
        uid,
        user.email,
        total_cards_owned,
        total_cards_ever_created,
        cards_traded_away,
        cards_received_via_trade,
        animated_cards_owned,
        total_print_run_copies,
        favorite_tier,
        rarest.card_id if rarest else None,
        total_spent,
        total_earned,
        total_offers_made,
        active_listings,
    )

    return ProfileKpiSnapshot(
        total_cards_owned=total_cards_owned,
        total_cards_ever_created=total_cards_ever_created,
        cards_traded_away=cards_traded_away,
        cards_received_via_trade=cards_received_via_trade,
        animated_cards_owned=animated_cards_owned,
        highlight_cards_owned=highlight_cards_owned,
        total_print_run_copies=total_print_run_copies,
        favorite_tier=favorite_tier,
        rarest_card=rarest,
        total_spent=total_spent,
        total_earned=total_earned,
        total_offers_made=total_offers_made,
        active_listings=active_listings,
        top_purchase=top_purchase,
        top_sale=top_sale,
    )
