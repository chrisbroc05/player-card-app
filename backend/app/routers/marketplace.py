"""Free Agency — peer-to-peer card marketplace API."""

from __future__ import annotations

import re
from datetime import timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import asc, desc, func, or_
from sqlalchemy.orm import Session

from auth import get_current_user
from card_repo import get_card_by_card_id
from database import get_db
from email_service import (
    frontend_url,
    send_marketplace_counter_accepted_seller_email,
    send_marketplace_counter_declined_seller_email,
    send_marketplace_counter_sent_buyer_email,
    send_marketplace_offer_accepted_buyer_email,
    send_marketplace_offer_cancelled_email,
    send_marketplace_offer_declined_email,
    send_marketplace_offer_received_email,
    send_marketplace_sale_confirmed_seller_email,
)
from marketplace_repo import (
    cancel_pending_marketplace_offers_for_card,
    clear_marketplace_listing,
    compute_royalty_amount,
    count_pending_offers_for_card,
    days_remaining_calendar,
    decimal_from_float,
    float_from_decimal,
    get_listed_card_or_none,
    listing_active_filter,
    listing_dict,
)
from models import Card, MarketplaceOffer, User, utcnow

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


def _tier_filter_values(tier: str) -> list[str] | None:
    t = (tier or "").strip().lower().replace("-", "_")
    if not t:
        return None
    if t == "rookie":
        return ["rookie"]
    if t in ("all_star", "allstar"):
        return ["all_star", "allstar"]
    if t == "legends":
        return ["legends"]
    return [t]


def _owner_display(db: Session, card: Card) -> str:
    if card.owner_id is None:
        return (card.owner_name or "—").strip() or "—"
    u = db.query(User).filter(User.id == card.owner_id).first()
    return (u.display_name if u else card.owner_name) or "—"


def _offer_extra_fields(offer: MarketplaceOffer) -> dict:
    now = utcnow()
    exp_iso = offer.expires_at.isoformat() if offer.expires_at else ""
    dr = days_remaining_calendar(offer.expires_at, now) if offer.expires_at else None
    ca = float_from_decimal(offer.counter_amount) if offer.counter_amount is not None else None
    return {
        "expires_at": exp_iso,
        "days_remaining": dr,
        "counter_amount": ca,
        "counter_at": offer.counter_at.isoformat() if offer.counter_at else None,
        "counter_status": offer.counter_status,
    }


def _block_if_counter_awaiting_buyer(offer: MarketplaceOffer) -> None:
    if offer.counter_status == "pending":
        raise HTTPException(
            status_code=400,
            detail="Awaiting buyer response to your counter-offer",
        )


class ListCardBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    card_id: str = Field(..., min_length=12, max_length=40)
    asking_price: float = Field(..., gt=0)


class UnlistCardBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    card_id: str = Field(..., min_length=12, max_length=40)


class SubmitOfferBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    card_id: str = Field(..., min_length=12, max_length=40)
    offer_amount: float = Field(..., ge=0.01)
    message: str | None = Field(default=None, max_length=2000)


class CounterOfferBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    counter_amount: float = Field(..., gt=0)


@router.post("/list")
def marketplace_list(
    body: ListCardBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = _resolve_card(db, body.card_id)
    if card.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not own this card")
    if (card.status or "active") != "active":
        raise HTTPException(status_code=400, detail="Only active cards can be listed")

    if body.asking_price < 1.0:
        raise HTTPException(status_code=400, detail="Asking price must be at least $1.00")

    price = decimal_from_float(body.asking_price)
    now = utcnow()

    if card.listed_on_marketplace:
        pass
    else:
        card.listed_on_marketplace = True

    card.asking_price = price
    card.listed_at = now
    card.listing_expires_at = now + timedelta(days=30)
    db.commit()
    db.refresh(card)
    le = card.listing_expires_at.isoformat() if card.listing_expires_at else ""
    return {
        "success": True,
        "card_id": card.card_id,
        "asking_price": float_from_decimal(price),
        "listing_expires_at": le,
    }


@router.post("/unlist")
def marketplace_unlist(
    body: UnlistCardBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = _resolve_card(db, body.card_id)
    if card.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not own this card")
    if not card.listed_on_marketplace:
        raise HTTPException(status_code=400, detail="Card is not listed on the marketplace")

    cancel_pending_marketplace_offers_for_card(db, card.card_id)
    clear_marketplace_listing(card)
    db.commit()
    return {"success": True, "card_id": card.card_id}


@router.get("/listings")
def marketplace_listings(
    db: Session = Depends(get_db),
    tier: str | None = Query(default=None),
    team_name: str | None = Query(default=None),
    player_name: str | None = Query(default=None),
    grad_year: int | None = Query(default=None),
    sort_by: str = Query(default="listed_at"),
    sort_order: str = Query(default="desc"),
):
    now = utcnow()
    q = (
        db.query(Card, User.display_name)
        .join(User, Card.owner_id == User.id)
        .filter(
            Card.listed_on_marketplace.is_(True),
            Card.status == "active",
            listing_active_filter(now),
        )
    )

    tier_vals = _tier_filter_values(tier) if tier else None
    if tier_vals:
        q = q.filter(Card.tier.in_(tier_vals))

    if team_name and team_name.strip():
        q = q.filter(Card.team_name.ilike(f"%{team_name.strip()}%"))
    if player_name and player_name.strip():
        q = q.filter(Card.player_name.ilike(f"%{player_name.strip()}%"))
    if grad_year is not None:
        q = q.filter(Card.grad_year == str(grad_year))

    sort_key = (sort_by or "listed_at").strip().lower()
    order_desc = (sort_order or "desc").strip().lower() != "asc"
    order_fn = desc if order_desc else asc

    if sort_key == "asking_price":
        q = q.order_by(order_fn(Card.asking_price))
    elif sort_key == "player_name":
        q = q.order_by(order_fn(Card.player_name))
    else:
        q = q.order_by(order_fn(Card.listed_at))

    rows = q.all()
    return [listing_dict(card, od or "—") for card, od in rows]


@router.get("/listings/{card_id}")
def marketplace_listing_detail(card_id: str, db: Session = Depends(get_db)):
    key = _canonical_card_id(card_id)
    if key is None:
        raise HTTPException(status_code=404, detail="Card not found")
    card = get_listed_card_or_none(db, key)
    if card is None:
        raise HTTPException(status_code=404, detail="Card not found or not listed")
    pending = count_pending_offers_for_card(db, card.card_id)
    return listing_dict(card, _owner_display(db, card), pending_offer_count=pending)


@router.post("/offer")
def marketplace_submit_offer(
    body: SubmitOfferBody,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    key = _canonical_card_id(body.card_id)
    if key is None:
        raise HTTPException(status_code=404, detail="Card not found")
    card = get_listed_card_or_none(db, key)
    if card is None:
        raise HTTPException(status_code=404, detail="Card not found or not listed")
    if card.owner_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot offer on your own card")

    existing = (
        db.query(MarketplaceOffer)
        .filter(
            MarketplaceOffer.card_id == card.card_id,
            MarketplaceOffer.buyer_id == current_user.id,
            MarketplaceOffer.status == "pending",
        )
        .first()
    )
    if existing is not None:
        raise HTTPException(status_code=400, detail="You already have a pending offer on this card")

    amount = decimal_from_float(body.offer_amount)
    royalty = compute_royalty_amount(amount)
    now = utcnow()
    offer = MarketplaceOffer(
        card_id=card.card_id,
        buyer_id=current_user.id,
        seller_id=card.owner_id,
        offer_amount=amount,
        royalty_amount=royalty,
        status="pending",
        message=(body.message or "").strip() or None,
        expires_at=now + timedelta(days=14),
        created_at=now,
        updated_at=now,
    )
    db.add(offer)
    db.commit()
    db.refresh(offer)

    owner = db.query(User).filter(User.id == card.owner_id).first()
    if owner:
        background_tasks.add_task(
            send_marketplace_offer_received_email,
            owner.email,
            owner.display_name,
            current_user.display_name,
            card.player_name,
            card.tier,
            card.rarity,
            card.image_url,
            float_from_decimal(amount),
            f"{frontend_url()}/marketplace/my-listings",
            offer.id,
        )

    return {
        "success": True,
        "offer_id": offer.id,
        "royalty_amount": float_from_decimal(royalty),
        "expires_at": offer.expires_at.isoformat() if offer.expires_at else "",
    }


def _get_pending_offer(db: Session, offer_id: int) -> MarketplaceOffer:
    offer = db.query(MarketplaceOffer).filter(MarketplaceOffer.id == offer_id).first()
    if offer is None:
        raise HTTPException(status_code=404, detail="Offer not found")
    if offer.status != "pending":
        raise HTTPException(status_code=400, detail="Offer is no longer pending")
    return offer


@router.post("/offer/{offer_id}/accept")
def marketplace_accept_offer(
    offer_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offer = _get_pending_offer(db, offer_id)
    _block_if_counter_awaiting_buyer(offer)
    card = get_card_by_card_id(db, offer.card_id)
    if card is None:
        raise HTTPException(status_code=404, detail="Card not found")
    if card.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the card owner can accept this offer")

    buyer = db.query(User).filter(User.id == offer.buyer_id).first()
    if buyer is None:
        raise HTTPException(status_code=400, detail="Buyer account not found")

    now = utcnow()
    offer.status = "accepted"
    offer.updated_at = now

    others = (
        db.query(MarketplaceOffer)
        .filter(
            MarketplaceOffer.card_id == card.card_id,
            MarketplaceOffer.status == "pending",
            MarketplaceOffer.id != offer.id,
        )
        .all()
    )
    for other in others:
        other.status = "cancelled"
        other.updated_at = now

    card.owner_id = buyer.id
    card.owner_name = buyer.display_name
    clear_marketplace_listing(card)

    db.commit()
    db.refresh(offer)

    amount_f = float_from_decimal(offer.offer_amount)
    collection_url = f"{frontend_url()}/my-collection"
    background_tasks.add_task(
        send_marketplace_offer_accepted_buyer_email,
        buyer.email,
        buyer.display_name,
        card.player_name,
        card.tier,
        card.rarity,
        card.image_url,
        amount_f,
        collection_url,
        offer.id,
    )
    background_tasks.add_task(
        send_marketplace_sale_confirmed_seller_email,
        current_user.email,
        current_user.display_name,
        buyer.display_name,
        card.player_name,
        card.tier,
        card.rarity,
        card.image_url,
        amount_f,
        collection_url,
        offer.id,
    )

    return {"success": True, "offer_id": offer.id, "card_id": card.card_id}


@router.post("/offer/{offer_id}/decline")
def marketplace_decline_offer(
    offer_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offer = _get_pending_offer(db, offer_id)
    _block_if_counter_awaiting_buyer(offer)
    card = get_card_by_card_id(db, offer.card_id)
    if card is None or card.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the card owner can decline this offer")

    offer.status = "declined"
    offer.updated_at = utcnow()
    db.commit()
    db.refresh(offer)

    buyer = db.query(User).filter(User.id == offer.buyer_id).first()
    if buyer and card:
        background_tasks.add_task(
            send_marketplace_offer_declined_email,
            buyer.email,
            buyer.display_name,
            card.player_name,
            card.tier,
            card.rarity,
            card.image_url,
            float_from_decimal(offer.offer_amount),
            f"{frontend_url()}/marketplace",
            offer.id,
        )

    return {"success": True, "offer_id": offer.id}


@router.post("/offer/{offer_id}/cancel")
def marketplace_cancel_offer(
    offer_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offer = _get_pending_offer(db, offer_id)
    if offer.buyer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the buyer can cancel this offer")
    if offer.counter_status == "pending":
        raise HTTPException(
            status_code=400,
            detail="Respond to the seller's counter-offer before cancelling",
        )

    card = get_card_by_card_id(db, offer.card_id)
    offer.status = "cancelled"
    offer.updated_at = utcnow()
    db.commit()
    db.refresh(offer)

    if card:
        background_tasks.add_task(
            send_marketplace_offer_cancelled_email,
            current_user.email,
            current_user.display_name,
            card.player_name,
            offer.id,
        )

    return {"success": True, "offer_id": offer.id}


@router.post("/offer/{offer_id}/counter")
def marketplace_offer_counter(
    offer_id: int,
    body: CounterOfferBody,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offer = _get_pending_offer(db, offer_id)
    card = get_card_by_card_id(db, offer.card_id)
    if card is None or card.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the card owner can counter this offer")
    if offer.counter_status is not None:
        raise HTTPException(status_code=400, detail="A counter-offer was already submitted for this offer")

    if body.counter_amount < 1.0:
        raise HTTPException(status_code=400, detail="Counter amount must be at least $1.00")

    ctr = decimal_from_float(body.counter_amount)
    if ctr == offer.offer_amount:
        raise HTTPException(status_code=400, detail="Counter amount must differ from the buyer's offer")

    now = utcnow()
    offer.counter_amount = ctr
    offer.counter_at = now
    offer.counter_status = "pending"
    offer.royalty_amount = compute_royalty_amount(ctr)
    offer.updated_at = now
    db.commit()
    db.refresh(offer)

    buyer = db.query(User).filter(User.id == offer.buyer_id).first()
    if buyer:
        background_tasks.add_task(
            send_marketplace_counter_sent_buyer_email,
            buyer.email,
            buyer.display_name,
            card.player_name,
            float_from_decimal(offer.offer_amount),
            float_from_decimal(ctr),
            f"{frontend_url()}/marketplace/my-offers",
            offer.id,
        )

    return {"success": True, "offer_id": offer.id, "counter_amount": float_from_decimal(ctr)}


@router.post("/offer/{offer_id}/counter/accept")
def marketplace_offer_counter_accept(
    offer_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offer = _get_pending_offer(db, offer_id)
    if offer.counter_status != "pending":
        raise HTTPException(status_code=400, detail="No pending counter-offer to accept")
    if offer.buyer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the buyer can accept this counter-offer")

    card = get_card_by_card_id(db, offer.card_id)
    if card is None:
        raise HTTPException(status_code=404, detail="Card not found")

    seller = db.query(User).filter(User.id == offer.seller_id).first()
    if seller is None:
        raise HTTPException(status_code=400, detail="Seller account not found")

    buyer = current_user
    now = utcnow()
    offer.counter_status = "accepted"
    offer.status = "accepted"
    offer.offer_amount = offer.counter_amount
    offer.updated_at = now

    others = (
        db.query(MarketplaceOffer)
        .filter(
            MarketplaceOffer.card_id == card.card_id,
            MarketplaceOffer.status == "pending",
            MarketplaceOffer.id != offer.id,
        )
        .all()
    )
    for other in others:
        other.status = "cancelled"
        other.updated_at = now

    card.owner_id = buyer.id
    card.owner_name = buyer.display_name
    clear_marketplace_listing(card)

    db.commit()
    db.refresh(offer)

    amount_f = float_from_decimal(offer.offer_amount)
    collection_url = f"{frontend_url()}/my-collection"
    background_tasks.add_task(
        send_marketplace_offer_accepted_buyer_email,
        buyer.email,
        buyer.display_name,
        card.player_name,
        card.tier,
        card.rarity,
        card.image_url,
        amount_f,
        collection_url,
        offer.id,
    )
    background_tasks.add_task(
        send_marketplace_counter_accepted_seller_email,
        seller.email,
        seller.display_name,
        card.player_name,
        amount_f,
        collection_url,
        offer.id,
    )

    return {"success": True, "offer_id": offer.id, "card_id": card.card_id}


@router.post("/offer/{offer_id}/counter/decline")
def marketplace_offer_counter_decline(
    offer_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offer = _get_pending_offer(db, offer_id)
    if offer.counter_status != "pending":
        raise HTTPException(status_code=400, detail="No pending counter-offer to decline")
    if offer.buyer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the buyer can decline this counter-offer")

    card = get_card_by_card_id(db, offer.card_id)
    seller = db.query(User).filter(User.id == offer.seller_id).first()

    now = utcnow()
    offer.counter_status = "declined"
    offer.status = "declined"
    offer.royalty_amount = compute_royalty_amount(offer.offer_amount)
    offer.updated_at = now
    db.commit()
    db.refresh(offer)

    if seller and card:
        background_tasks.add_task(
            send_marketplace_counter_declined_seller_email,
            seller.email,
            seller.display_name,
            card.player_name,
            float_from_decimal(offer.counter_amount) if offer.counter_amount else 0.0,
            f"{frontend_url()}/marketplace/my-listings",
            offer.id,
        )

    return {"success": True, "offer_id": offer.id}


@router.get("/my-listings")
def marketplace_my_listings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = utcnow()
    rows = (
        db.query(Card)
        .filter(
            Card.owner_id == current_user.id,
            Card.listed_on_marketplace.is_(True),
            listing_active_filter(now),
        )
        .order_by(Card.listed_at.desc())
        .all()
    )
    out = []
    for card in rows:
        pending = count_pending_offers_for_card(db, card.card_id)
        out.append(listing_dict(card, current_user.display_name, pending_offer_count=pending))
    return out


@router.get("/my-offers")
def marketplace_my_offers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(MarketplaceOffer, Card)
        .join(Card, MarketplaceOffer.card_id == Card.card_id)
        .filter(MarketplaceOffer.buyer_id == current_user.id)
        .order_by(MarketplaceOffer.created_at.desc())
        .all()
    )
    out = []
    for offer, card in rows:
        owner_dn = _owner_display(db, card)
        row = {
            "offer_id": offer.id,
            "card_id": card.card_id,
            "player_name": card.player_name,
            "image_url": card.image_url,
            "offer_amount": float_from_decimal(offer.offer_amount),
            "asking_price": float_from_decimal(card.asking_price),
            "status": offer.status,
            "message": offer.message or "",
            "created_at": offer.created_at.isoformat() if offer.created_at else "",
            "owner_display_name": owner_dn,
        }
        row.update(_offer_extra_fields(offer))
        out.append(row)
    return out


@router.get("/incoming-offers")
def marketplace_incoming_offers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(MarketplaceOffer, Card, User)
        .join(Card, MarketplaceOffer.card_id == Card.card_id)
        .join(User, MarketplaceOffer.buyer_id == User.id)
        .filter(Card.owner_id == current_user.id, MarketplaceOffer.status == "pending")
        .order_by(MarketplaceOffer.created_at.desc())
        .all()
    )
    out = []
    for offer, card, buyer in rows:
        row = {
            "offer_id": offer.id,
            "card_id": card.card_id,
            "player_name": card.player_name,
            "image_url": card.image_url,
            "offer_amount": float_from_decimal(offer.offer_amount),
            "asking_price": float_from_decimal(card.asking_price),
            "royalty_amount": float_from_decimal(offer.royalty_amount),
            "message": offer.message or "",
            "created_at": offer.created_at.isoformat() if offer.created_at else "",
            "buyer_display_name": buyer.display_name,
            "buyer_email": buyer.email,
        }
        row.update(_offer_extra_fields(offer))
        out.append(row)
    return out


@router.get("/incoming-offers/count")
def marketplace_incoming_offers_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = (
        db.query(func.count(MarketplaceOffer.id))
        .join(Card, MarketplaceOffer.card_id == Card.card_id)
        .filter(
            Card.owner_id == current_user.id,
            MarketplaceOffer.status == "pending",
            or_(
                MarketplaceOffer.counter_status.is_(None),
                MarketplaceOffer.counter_status != "pending",
            ),
        )
        .scalar()
    )
    return {"count": int(count or 0)}
