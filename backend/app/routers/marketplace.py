"""Free Agency — peer-to-peer card marketplace API."""

from __future__ import annotations

import logging
import os
import re
import uuid
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP

import stripe
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import asc, desc, func, or_
from sqlalchemy.orm import Session

from auth import get_current_user
from card_repo import get_card_by_card_id
from credit_service import (
    InsufficientCreditsError,
    TX_ROYALTY,
    add_credits,
    deduct_credits,
)
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
    PRIORITY_LISTING_FEE,
    apply_priority_listing,
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
    log_priority_listing_pending_charge,
    partition_and_sort_marketplace_rows,
)
from marketplace_trade_repo import (
    OFFER_TYPE_CARD_TRADE,
    OFFER_TYPE_CASH,
    TRADE_SIDE_BUYER,
    TRADE_SIDE_SELLER,
    attach_trade_cards,
    cancel_pending_offers_with_trade_release,
    execute_card_trade_accept,
    format_trade_cards_email_lines,
    offer_trade_fields,
    release_trade_cards_for_offer,
    validate_trade_card_ids_for_user,
)
from models import Card, MarketplaceOffer, MarketplaceTradeCard, User, utcnow
from parent_email_utils import parent_email_for_notify

router = APIRouter()
logger = logging.getLogger(__name__)

_CARD_ID_PATH_PATTERN = re.compile(r"^FL-(\d{4})-(\d{6})$", re.IGNORECASE)


def _decimal_to_cents(amount: Decimal | float | int | None) -> int:
    """Convert USD amount to integer cents with deterministic rounding."""
    if amount is None:
        return 0
    dec = amount if isinstance(amount, Decimal) else Decimal(str(amount))
    cents = (dec * Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return int(cents)


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


def _platform_admin_user(db: Session) -> User:
    admin_email_raw = (os.environ.get("ADMIN_EMAIL") or "").strip()
    admin_email = admin_email_raw.lower()
    logger.info("Marketplace royalty lookup for ADMIN_EMAIL='%s'", admin_email_raw)
    if not admin_email:
        raise HTTPException(status_code=503, detail="ADMIN_EMAIL is not configured")
    admin_user = db.query(User).filter(func.lower(User.email) == admin_email).first()
    logger.info(
        "Marketplace royalty admin lookup result for '%s': %s",
        admin_email_raw,
        f"user_id={admin_user.id}, email={admin_user.email}" if admin_user else "none",
    )
    if admin_user is None:
        near_matches = (
            db.query(User.id, User.email)
            .filter(User.email.ilike(f"%{admin_email_raw}%"))
            .limit(5)
            .all()
        )
        logger.error(
            "Admin account not found for email: %s. Near matches: %s",
            admin_email_raw,
            [(int(uid), email) for uid, email in near_matches],
        )
        logger.warning("Auto-creating platform admin user for marketplace royalties: %s", admin_email_raw)
        admin_user = User(
            email=admin_email,
            display_name="Platform Admin",
            hashed_password=f"!platform-admin-autocreated-{uuid.uuid4().hex}",
            parent_email=None,
        )
        try:
            db.add(admin_user)
            db.flush()
            logger.warning(
                "Marketplace auto-created platform admin user: user_id=%s email=%s",
                admin_user.id,
                admin_user.email,
            )
        except Exception as exc:
            logger.error("Failed to auto-create platform admin user in marketplace: %s", str(exc))
            raise HTTPException(status_code=503, detail="Platform admin account not found") from exc
    return admin_user


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
    is_priority: bool = Field(default=False)


class UnlistCardBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    card_id: str = Field(..., min_length=12, max_length=40)


class SubmitOfferBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    card_id: str = Field(..., min_length=12, max_length=40)
    offer_amount: float | None = Field(default=None, ge=0)
    message: str | None = Field(default=None, max_length=2000)
    offer_type: str = Field(default="cash")
    trade_card_ids: list[str] = Field(default_factory=list)


class CounterOfferBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    counter_amount: float | None = Field(default=None, gt=0)
    trade_card_ids: list[str] = Field(default_factory=list)


def _normalized_offer_type(raw: str) -> str:
    t = (raw or OFFER_TYPE_CASH).strip().lower()
    if t == OFFER_TYPE_CARD_TRADE:
        return OFFER_TYPE_CARD_TRADE
    return OFFER_TYPE_CASH


def _is_card_trade_offer(offer: MarketplaceOffer) -> bool:
    return (offer.offer_type or OFFER_TYPE_CASH).strip().lower() == OFFER_TYPE_CARD_TRADE


def _email_trade_extras(db: Session, offer: MarketplaceOffer) -> dict:
    fields = offer_trade_fields(db, offer)
    is_trade = fields["offer_type"] == OFFER_TYPE_CARD_TRADE
    return {
        "is_card_trade": is_trade,
        "trade_cards_summary": format_trade_cards_email_lines(fields["trade_cards_offered"])
        if is_trade
        else "",
        "counter_trade_summary": format_trade_cards_email_lines(fields["trade_cards_counter"])
        if is_trade
        else "",
    }


def _settle_cash_offer_credits(
    db: Session,
    *,
    offer: MarketplaceOffer,
    card: Card,
    buyer_id: int,
    seller_id: int,
    amount_decimal: Decimal,
) -> tuple[User, User, float, float, float, float, float]:
    buyer = db.query(User).filter(User.id == buyer_id).first()
    if buyer is None:
        raise HTTPException(status_code=400, detail="Buyer account not found")
    seller = db.query(User).filter(User.id == seller_id).first()
    if seller is None:
        raise HTTPException(status_code=400, detail="Seller account not found")

    offer_amount = float_from_decimal(amount_decimal)
    if float(buyer.credit_balance or 0) < offer_amount:
        raise HTTPException(status_code=400, detail="Buyer has insufficient credits")

    royalty_amount_f = round(offer_amount * 0.02, 2)
    seller_receives_f = round(offer_amount - royalty_amount_f, 2)

    try:
        buyer_row = deduct_credits(
            user_id=buyer.id,
            amount=offer_amount,
            transaction_type="card_purchase",
            reference_id=str(offer.id),
            note=f"Purchased {card.player_name} ({card.card_id})",
            db=db,
            commit=False,
        )
    except InsufficientCreditsError as e:
        raise HTTPException(status_code=400, detail="Buyer has insufficient credits") from e

    seller_row = add_credits(
        user_id=seller.id,
        amount=seller_receives_f,
        transaction_type="card_sale",
        reference_id=str(offer.id),
        note=f"Sold {card.player_name} ({card.card_id})",
        db=db,
    )

    platform_admin = _platform_admin_user(db)
    add_credits(
        user_id=platform_admin.id,
        amount=royalty_amount_f,
        transaction_type=TX_ROYALTY,
        reference_id=str(offer.id),
        note=(
            "2% royalty - "
            f"{buyer.display_name} purchased {card.player_name} ({card.card_id}) "
            f"from {seller.display_name} for ${offer_amount:.2f}"
        ),
        db=db,
    )

    offer.royalty_amount = decimal_from_float(royalty_amount_f)
    return (
        buyer,
        seller,
        offer_amount,
        royalty_amount_f,
        seller_receives_f,
        float_from_decimal(buyer_row.balance_after),
        float_from_decimal(seller_row.balance_after),
    )


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

    priority_fee_pending = None
    if body.is_priority:
        apply_priority_listing(card, now=now)
        log_priority_listing_pending_charge(card_id=card.card_id, user_id=current_user.id)
        priority_fee_pending = float(PRIORITY_LISTING_FEE)
        logger.info(
            "Priority boost enabled for card %s (payment stub — Stripe not connected)",
            card.card_id,
        )

    db.commit()
    db.refresh(card)
    le = card.listing_expires_at.isoformat() if card.listing_expires_at else ""
    pe = card.priority_expires_at.isoformat() if card.priority_expires_at else ""
    return {
        "success": True,
        "card_id": card.card_id,
        "asking_price": float_from_decimal(price),
        "listing_expires_at": le,
        "is_priority_listing": bool(card.is_priority_listing),
        "priority_expires_at": pe,
        "priority_fee_pending": priority_fee_pending,
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
    rows = q.all()
    ordered = partition_and_sort_marketplace_rows(
        rows,
        sort_by=sort_key,
        sort_order=sort_order or "desc",
        now=now,
    )
    return [listing_dict(card, od or "—") for card, od in ordered]


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

    offer_type = _normalized_offer_type(body.offer_type)
    now = utcnow()

    if offer_type == OFFER_TYPE_CARD_TRADE:
        try:
            trade_cards = validate_trade_card_ids_for_user(
                db,
                user_id=current_user.id,
                trade_card_ids=body.trade_card_ids,
                exclude_listing_card_id=card.card_id,
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e
        amount = Decimal("0.00")
        royalty = Decimal("0.00")
    else:
        if body.offer_amount is None or body.offer_amount < 0.01:
            raise HTTPException(status_code=400, detail="Offer amount must be at least $0.01")
        amount = decimal_from_float(body.offer_amount)
        royalty = compute_royalty_amount(amount)
        trade_cards = []

    offer = MarketplaceOffer(
        card_id=card.card_id,
        buyer_id=current_user.id,
        seller_id=card.owner_id,
        offer_amount=amount,
        offer_type=offer_type,
        royalty_amount=royalty,
        status="pending",
        message=(body.message or "").strip() or None,
        expires_at=now + timedelta(days=14),
        created_at=now,
        updated_at=now,
    )
    db.add(offer)
    db.flush()

    if offer_type == OFFER_TYPE_CARD_TRADE:
        attach_trade_cards(
            db,
            offer_id=offer.id,
            side=TRADE_SIDE_BUYER,
            cards=trade_cards,
            lock_pending_trade=True,
        )

    db.commit()
    db.refresh(offer)

    owner = db.query(User).filter(User.id == card.owner_id).first()
    if owner:
        extras = _email_trade_extras(db, offer)
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
            **extras,
            parent_email=parent_email_for_notify(owner),
        )

    return {
        "success": True,
        "offer_id": offer.id,
        "offer_type": offer_type,
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

    now = utcnow()
    offer.status = "accepted"
    offer.updated_at = now
    extras = _email_trade_extras(db, offer)
    buyer_balance_after = None
    seller_balance_after = None
    royalty_amount_f = 0.0
    seller_receives_f = 0.0

    if _is_card_trade_offer(offer):
        buyer = db.query(User).filter(User.id == offer.buyer_id).first()
        if buyer is None:
            raise HTTPException(status_code=400, detail="Buyer account not found")
        try:
            execute_card_trade_accept(db, offer, card, include_seller_counter=False)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e
    else:
        (
            buyer,
            _seller_user,
            _offer_amount_f,
            royalty_amount_f,
            seller_receives_f,
            buyer_balance_after,
            seller_balance_after,
        ) = _settle_cash_offer_credits(
            db,
            offer=offer,
            card=card,
            buyer_id=offer.buyer_id,
            seller_id=card.owner_id,
            amount_decimal=offer.offer_amount,
        )
        cancel_pending_offers_with_trade_release(
            db,
            listing_card_id=card.card_id,
            except_offer_id=offer.id,
            now=now,
        )
        card.owner_id = buyer.id
        card.owner_name = buyer.display_name
        clear_marketplace_listing(card)

    db.commit()
    db.refresh(offer)

    amount_f = float_from_decimal(offer.offer_amount)
    collection_url = f"{frontend_url()}/my-collection"
    payout_initiated = False

    if (
        not _is_card_trade_offer(offer)
        and current_user.stripe_payouts_enabled
        and (current_user.stripe_account_id or "").strip()
    ):
        try:
            stripe.api_key = (os.environ.get("STRIPE_SECRET_KEY") or "").strip()
            gross_cents = _decimal_to_cents(offer.offer_amount)
            royalty_cents = _decimal_to_cents(offer.royalty_amount)
            net_transfer_cents = max(0, gross_cents - royalty_cents)
            stripe.Transfer.create(
                amount=net_transfer_cents,
                currency="usd",
                destination=current_user.stripe_account_id,
                transfer_group=str(offer.id),
                description=f"Marketplace sale payout for {card.card_id}",
                metadata={
                    "offer_id": str(offer.id),
                    "card_id": card.card_id,
                    "gross_cents": str(gross_cents),
                    "royalty_cents": str(royalty_cents),
                    "net_transfer_cents": str(net_transfer_cents),
                },
            )
            payout_initiated = True
            print(
                f"TRANSFER SUCCESS: ${net_transfer_cents / 100:.2f} to {current_user.stripe_account_id} "
                f"(gross=${gross_cents / 100:.2f}, royalty=${royalty_cents / 100:.2f})",
                flush=True,
            )
        except Exception as e:
            print(f"TRANSFER ERROR: {str(e)}", flush=True)

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
        amount_paid_credits=amount_f if not _is_card_trade_offer(offer) else None,
        new_credit_balance=buyer_balance_after if not _is_card_trade_offer(offer) else None,
        **extras,
        parent_email=parent_email_for_notify(buyer),
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
        platform_fee=royalty_amount_f if not _is_card_trade_offer(offer) else None,
        earnings=seller_receives_f if not _is_card_trade_offer(offer) else None,
        new_credit_balance=seller_balance_after if not _is_card_trade_offer(offer) else None,
        payout_initiated=payout_initiated if not _is_card_trade_offer(offer) else None,
        **extras,
        parent_email=parent_email_for_notify(current_user),
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

    if _is_card_trade_offer(offer):
        release_trade_cards_for_offer(db, offer.id, sides=[TRADE_SIDE_BUYER])

    offer.status = "declined"
    offer.updated_at = utcnow()
    db.commit()
    db.refresh(offer)

    buyer = db.query(User).filter(User.id == offer.buyer_id).first()
    if buyer and card:
        extras = _email_trade_extras(db, offer)
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
            **extras,
            parent_email=parent_email_for_notify(buyer),
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
    if _is_card_trade_offer(offer):
        release_trade_cards_for_offer(db, offer.id, sides=[TRADE_SIDE_BUYER])
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
            parent_email=parent_email_for_notify(current_user),
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

    now = utcnow()

    if _is_card_trade_offer(offer):
        if body.counter_amount is not None and body.counter_amount > 0:
            raise HTTPException(status_code=400, detail="Use card trade counter for this offer")
        try:
            counter_cards = validate_trade_card_ids_for_user(
                db,
                user_id=current_user.id,
                trade_card_ids=body.trade_card_ids,
                exclude_listing_card_id=card.card_id,
                exclude_offer_id=offer.id,
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e
        db.query(MarketplaceTradeCard).filter(
            MarketplaceTradeCard.offer_id == offer.id,
            MarketplaceTradeCard.side == TRADE_SIDE_SELLER,
        ).delete(synchronize_session=False)
        attach_trade_cards(
            db,
            offer_id=offer.id,
            side=TRADE_SIDE_SELLER,
            cards=counter_cards,
            lock_pending_trade=True,
        )
        offer.counter_amount = Decimal("0.00")
        offer.royalty_amount = Decimal("0.00")
        ctr_f = 0.0
        orig_f = 0.0
    else:
        if body.trade_card_ids:
            raise HTTPException(status_code=400, detail="Use cash counter for this offer")
        if body.counter_amount is None or body.counter_amount < 1.0:
            raise HTTPException(status_code=400, detail="Counter amount must be at least $1.00")
        ctr = decimal_from_float(body.counter_amount)
        if ctr == offer.offer_amount:
            raise HTTPException(status_code=400, detail="Counter amount must differ from the buyer's offer")
        offer.counter_amount = ctr
        offer.royalty_amount = compute_royalty_amount(ctr)
        ctr_f = float_from_decimal(ctr)
        orig_f = float_from_decimal(offer.offer_amount)

    offer.counter_at = now
    offer.counter_status = "pending"
    offer.updated_at = now
    db.commit()
    db.refresh(offer)

    buyer = db.query(User).filter(User.id == offer.buyer_id).first()
    if buyer:
        extras = _email_trade_extras(db, offer)
        background_tasks.add_task(
            send_marketplace_counter_sent_buyer_email,
            buyer.email,
            buyer.display_name,
            card.player_name,
            orig_f,
            ctr_f,
            f"{frontend_url()}/marketplace/my-offers",
            offer.id,
            **extras,
            parent_email=parent_email_for_notify(buyer),
        )

    return {
        "success": True,
        "offer_id": offer.id,
        "counter_amount": ctr_f,
        "offer_type": offer.offer_type,
    }


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

    buyer = current_user
    now = utcnow()
    offer.counter_status = "accepted"
    offer.status = "accepted"
    if not _is_card_trade_offer(offer):
        offer.offer_amount = offer.counter_amount
    offer.updated_at = now
    extras = _email_trade_extras(db, offer)
    buyer_balance_after = None
    seller_balance_after = None
    royalty_amount_f = 0.0
    seller_receives_f = 0.0

    if _is_card_trade_offer(offer):
        seller = db.query(User).filter(User.id == offer.seller_id).first()
        if seller is None:
            raise HTTPException(status_code=400, detail="Seller account not found")
        try:
            execute_card_trade_accept(db, offer, card, include_seller_counter=True)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e
    else:
        counter_amt = offer.counter_amount or offer.offer_amount
        (
            _buyer_user,
            seller,
            _offer_amount_f,
            royalty_amount_f,
            seller_receives_f,
            buyer_balance_after,
            seller_balance_after,
        ) = _settle_cash_offer_credits(
            db,
            offer=offer,
            card=card,
            buyer_id=buyer.id,
            seller_id=offer.seller_id,
            amount_decimal=counter_amt,
        )
        offer.offer_amount = counter_amt
        cancel_pending_offers_with_trade_release(
            db,
            listing_card_id=card.card_id,
            except_offer_id=offer.id,
            now=now,
        )
        card.owner_id = buyer.id
        card.owner_name = buyer.display_name
        clear_marketplace_listing(card)

    db.commit()
    db.refresh(offer)

    amount_f = float_from_decimal(offer.counter_amount or offer.offer_amount)
    collection_url = f"{frontend_url()}/my-collection"
    payout_initiated = False

    if (
        not _is_card_trade_offer(offer)
        and seller.stripe_payouts_enabled
        and (seller.stripe_account_id or "").strip()
    ):
        try:
            stripe.api_key = (os.environ.get("STRIPE_SECRET_KEY") or "").strip()
            gross_cents = _decimal_to_cents(offer.offer_amount)
            royalty_cents = _decimal_to_cents(offer.royalty_amount)
            net_transfer_cents = max(0, gross_cents - royalty_cents)
            stripe.Transfer.create(
                amount=net_transfer_cents,
                currency="usd",
                destination=seller.stripe_account_id,
                transfer_group=str(offer.id),
                description=f"Marketplace counter sale payout for {card.card_id}",
                metadata={
                    "offer_id": str(offer.id),
                    "card_id": card.card_id,
                    "gross_cents": str(gross_cents),
                    "royalty_cents": str(royalty_cents),
                    "net_transfer_cents": str(net_transfer_cents),
                },
            )
            payout_initiated = True
            print(
                f"TRANSFER SUCCESS: ${net_transfer_cents / 100:.2f} to {seller.stripe_account_id} "
                f"(gross=${gross_cents / 100:.2f}, royalty=${royalty_cents / 100:.2f})",
                flush=True,
            )
        except Exception as e:
            print(f"TRANSFER ERROR: {str(e)}", flush=True)

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
        amount_paid_credits=amount_f if not _is_card_trade_offer(offer) else None,
        new_credit_balance=buyer_balance_after if not _is_card_trade_offer(offer) else None,
        **extras,
        parent_email=parent_email_for_notify(buyer),
    )
    background_tasks.add_task(
        send_marketplace_counter_accepted_seller_email,
        seller.email,
        seller.display_name,
        card.player_name,
        amount_f,
        collection_url,
        offer.id,
        platform_fee=royalty_amount_f if not _is_card_trade_offer(offer) else None,
        earnings=seller_receives_f if not _is_card_trade_offer(offer) else None,
        new_credit_balance=seller_balance_after if not _is_card_trade_offer(offer) else None,
        payout_initiated=payout_initiated if not _is_card_trade_offer(offer) else None,
        **extras,
        parent_email=parent_email_for_notify(seller),
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
    if _is_card_trade_offer(offer):
        release_trade_cards_for_offer(db, offer.id)
    else:
        release_trade_cards_for_offer(db, offer.id, sides=[TRADE_SIDE_SELLER])
        offer.royalty_amount = compute_royalty_amount(offer.offer_amount)

    offer.counter_status = "declined"
    offer.status = "declined"
    offer.updated_at = now
    db.commit()
    db.refresh(offer)

    if seller and card:
        extras = _email_trade_extras(db, offer)
        background_tasks.add_task(
            send_marketplace_counter_declined_seller_email,
            seller.email,
            seller.display_name,
            card.player_name,
            float_from_decimal(offer.counter_amount) if offer.counter_amount else 0.0,
            f"{frontend_url()}/marketplace/my-listings",
            offer.id,
            **extras,
            parent_email=parent_email_for_notify(seller),
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
        row.update(offer_trade_fields(db, offer))
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
        row.update(offer_trade_fields(db, offer))
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
