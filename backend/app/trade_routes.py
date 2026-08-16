"""Trade API routes."""

from __future__ import annotations

import re
from datetime import datetime, timezone

from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from auth import get_current_user
from card_repo import card_to_dict, get_card_by_card_id
from email_service import (
    frontend_url,
    send_trade_accepted_email,
    send_trade_cancelled_email,
    send_trade_declined_email,
    send_trade_offer_email,
)
from database import get_db
from parent_email_utils import parent_email_for_notify
from email_notify import schedule_user_email
from models import Card, TradeOffer, User
from marketplace_repo import cancel_pending_marketplace_offers_for_card, clear_marketplace_listing
from trade_repo import (
    count_incoming_pending,
    find_recipient_by_identifier,
    get_trade_by_id,
    list_incoming_pending,
    list_outgoing_pending,
    utcnow,
)

router = APIRouter()

_CARD_ID_PATH_PATTERN = re.compile(r"^FL-(\d{4})-(\d{6})$", re.IGNORECASE)


def _canonical_collectible_id(raw: str) -> str | None:
    s = (raw or "").strip()
    m = _CARD_ID_PATH_PATTERN.match(s)
    if not m:
        return None
    return f"FL-{m.group(1)}-{m.group(2)}"


class TradeSendBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    card_id: str = Field(..., min_length=12, max_length=40)
    recipient_identifier: str = Field(..., min_length=1, max_length=320)
    message: str | None = Field(default=None, max_length=2000)


class UserBrief(BaseModel):
    id: int
    email: str
    display_name: str


class TradeOfferResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    card_id: int
    sender_id: int
    recipient_id: int
    status: str
    created_at: str
    updated_at: str
    message: str | None
    card: dict[str, Any]
    sender: UserBrief
    recipient: UserBrief


def _user_brief(u: User) -> UserBrief:
    return UserBrief(id=u.id, email=u.email, display_name=u.display_name)


def _offer_to_response(db: Session, offer: TradeOffer) -> TradeOfferResponse:
    c = offer.card
    created = offer.created_at
    updated = offer.updated_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    if updated.tzinfo is None:
        updated = updated.replace(tzinfo=timezone.utc)
    return TradeOfferResponse(
        id=offer.id,
        card_id=offer.card_id,
        sender_id=offer.sender_id,
        recipient_id=offer.recipient_id,
        status=offer.status,
        created_at=created.isoformat(),
        updated_at=updated.isoformat(),
        message=offer.message,
        card=card_to_dict(c, db),
        sender=_user_brief(offer.sender),
        recipient=_user_brief(offer.recipient),
    )


@router.get("/incoming/count")
def trades_incoming_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {"count": count_incoming_pending(db, current_user.id)}


@router.get("/incoming", response_model=list[TradeOfferResponse])
def trades_incoming(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = list_incoming_pending(db, current_user.id)
    return [_offer_to_response(db, o) for o in rows]


@router.get("/outgoing", response_model=list[TradeOfferResponse])
def trades_outgoing(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = list_outgoing_pending(db, current_user.id)
    return [_offer_to_response(db, o) for o in rows]


@router.post("/send", response_model=TradeOfferResponse, status_code=status.HTTP_201_CREATED)
def trades_send(
    body: TradeSendBody,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    key = _canonical_collectible_id(body.card_id)
    if key is None:
        raise HTTPException(status_code=404, detail="Card not found")
    card = get_card_by_card_id(db, key)
    if card is None:
        raise HTTPException(status_code=404, detail="Card not found")
    if card.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not own this card")
    if (card.status or "active") != "active":
        raise HTTPException(status_code=400, detail="Card is already in a pending trade")

    recipient = find_recipient_by_identifier(db, body.recipient_identifier)
    if recipient is None:
        raise HTTPException(status_code=404, detail="User not found")
    if recipient.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot send a card to yourself")

    offer = TradeOffer(
        card_id=card.id,
        sender_id=current_user.id,
        recipient_id=recipient.id,
        status="pending",
        message=(body.message or "").strip() or None,
    )
    db.add(offer)
    db.flush()
    new_id = offer.id
    card.status = "pending_trade"
    card.trade_offered_to = recipient.id
    db.commit()
    offer = get_trade_by_id(db, new_id)
    if offer is None:
        raise HTTPException(status_code=500, detail="Trade creation failed")
    schedule_user_email(
        background_tasks,
        recipient,
        "email_trade_request",
        send_trade_offer_email,
        recipient.email,
        recipient.display_name,
        current_user.display_name,
        card.player_name,
        card.tier,
        card.rarity,
        card.image_url,
        offer.message,
        f"{frontend_url()}/trades",
        new_id,
        parent_email=parent_email_for_notify(recipient),
    )
    return _offer_to_response(db, offer)


@router.post("/{trade_id}/accept")
def trades_accept(
    trade_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offer = get_trade_by_id(db, trade_id)
    if offer is None:
        raise HTTPException(status_code=404, detail="Trade offer not found")
    if offer.recipient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the recipient can accept this trade")
    if offer.status != "pending":
        raise HTTPException(status_code=400, detail="This trade is no longer pending")

    card = offer.card
    sender = offer.sender
    sender_email = sender.email
    sender_name = sender.display_name
    recipient_name = current_user.display_name
    card_player_name = card.player_name
    card_tier = card.tier
    card_rarity = card.rarity
    card_image_url = card.image_url
    cancel_pending_marketplace_offers_for_card(db, card.card_id)
    if card.listed_on_marketplace:
        clear_marketplace_listing(card)

    card.owner_id = current_user.id
    card.owner_name = current_user.display_name
    card.status = "active"
    card.trade_offered_to = None
    offer.status = "accepted"
    offer.updated_at = utcnow()
    db.commit()
    db.refresh(card)
    background_tasks.add_task(
        send_trade_accepted_email,
        sender_email,
        sender_name,
        recipient_name,
        card_player_name,
        card_tier,
        card_rarity,
        card_image_url,
        f"{frontend_url()}/my-collection",
        trade_id,
        parent_email=parent_email_for_notify(sender),
    )
    return card_to_dict(card, db)


@router.post("/{trade_id}/decline", response_model=TradeOfferResponse)
def trades_decline(
    trade_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offer = get_trade_by_id(db, trade_id)
    if offer is None:
        raise HTTPException(status_code=404, detail="Trade offer not found")
    if offer.recipient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the recipient can decline this trade")
    if offer.status != "pending":
        raise HTTPException(status_code=400, detail="This trade is no longer pending")

    card = offer.card
    sender = offer.sender
    sender_email = sender.email
    sender_name = sender.display_name
    recipient_name = current_user.display_name
    card_player_name = card.player_name
    card_tier = card.tier
    card_rarity = card.rarity
    card_image_url = card.image_url
    card.status = "active"
    card.trade_offered_to = None
    offer.status = "declined"
    offer.updated_at = utcnow()
    db.commit()
    db.refresh(offer)
    background_tasks.add_task(
        send_trade_declined_email,
        sender_email,
        sender_name,
        recipient_name,
        card_player_name,
        card_tier,
        card_rarity,
        card_image_url,
        f"{frontend_url()}/my-collection",
        trade_id,
        parent_email=parent_email_for_notify(sender),
    )
    return _offer_to_response(db, offer)


@router.post("/{trade_id}/cancel", response_model=TradeOfferResponse)
def trades_cancel(
    trade_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offer = get_trade_by_id(db, trade_id)
    if offer is None:
        raise HTTPException(status_code=404, detail="Trade offer not found")
    if offer.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the sender can cancel this trade")
    if offer.status != "pending":
        raise HTTPException(status_code=400, detail="This trade is no longer pending")

    card = offer.card
    recipient = offer.recipient
    recipient_email = recipient.email
    recipient_name = recipient.display_name
    sender_name = offer.sender.display_name
    card_player_name = card.player_name
    card_tier = card.tier
    card_rarity = card.rarity
    card_image_url = card.image_url
    card.status = "active"
    card.trade_offered_to = None
    offer.status = "cancelled"
    offer.updated_at = utcnow()
    db.commit()
    db.refresh(offer)
    background_tasks.add_task(
        send_trade_cancelled_email,
        recipient_email,
        recipient_name,
        sender_name,
        card_player_name,
        card_tier,
        card_rarity,
        card_image_url,
        trade_id,
        parent_email=parent_email_for_notify(recipient),
    )
    return _offer_to_response(db, offer)
