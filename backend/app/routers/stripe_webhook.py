"""Stripe webhook handler — idempotent processing for Connect marketplace events."""

from __future__ import annotations

import logging
import os
from decimal import Decimal

import stripe
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from card_creation_service import fulfill_card_creation_from_webhook
from credit_service import apply_stripe_checkout_credits
from database import engine
from marketplace_service import (
    apply_marketplace_stripe_checkout,
    mark_stripe_event_processed,
    refund_marketplace_withdrawal,
    stripe_event_already_processed,
)
from models import User
from stripe_connect import STATUS_ACTIVE, STATUS_PENDING

logger = logging.getLogger(__name__)

STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET")

router = APIRouter()


@router.get("/test")
def webhook_router_test():
    """Temporary reachability check — confirms router is mounted at /webhooks/test."""
    return {"status": "webhook router is reachable"}


def _configure_stripe() -> None:
    stripe.api_key = (os.environ.get("STRIPE_SECRET_KEY") or "").strip()


def _as_stripe_dict(obj) -> dict:
    """Normalize stripe SDK objects (v15+) or plain dicts for handler code."""
    if obj is None:
        return {}
    if isinstance(obj, dict):
        return obj
    to_dict = getattr(obj, "to_dict", None)
    if callable(to_dict):
        return to_dict()
    return dict(obj)


def _handle_checkout_completed(db: Session, session: dict, event_id: str) -> None:
    metadata = session.get("metadata") or {}
    fund_type = (metadata.get("fund_type") or "card").strip().lower()
    session_id = session.get("id") or ""
    purchaser_user_id = int(metadata.get("user_id") or 0)
    recipient_raw = metadata.get("recipient_user_id")
    recipient_user_id = int(recipient_raw) if recipient_raw else purchaser_user_id
    amount = Decimal(str(metadata.get("amount_dollars") or "0"))

    logger.info(
        "WEBHOOK checkout.session.completed fund_type=%s session=%s recipient=%s amount=%s",
        fund_type,
        session_id,
        recipient_user_id,
        amount,
    )

    if fund_type == "marketplace":
        apply_marketplace_stripe_checkout(
            db,
            session_id=session_id,
            recipient_user_id=recipient_user_id,
            amount_dollars=amount,
        )
    elif fund_type == "card_creation":
        fulfill_card_creation_from_webhook(db, session)
    elif fund_type == "card":
        apply_stripe_checkout_credits(
            db,
            session_id=session_id,
            purchaser_user_id=purchaser_user_id,
            recipient_user_id=recipient_user_id,
            amount_dollars=amount,
        )
    else:
        logger.warning(
            "Unknown checkout fund_type=%s session=%s — skipping",
            fund_type,
            session_id,
        )
    mark_stripe_event_processed(db, event_id, "checkout.session.completed")
    db.commit()


def _handle_account_updated(db: Session, account_obj: dict, event_id: str) -> None:
    account_id = account_obj.get("id")
    payouts_enabled = bool(account_obj.get("payouts_enabled"))
    charges_enabled = bool(account_obj.get("charges_enabled"))
    details_submitted = bool(account_obj.get("details_submitted"))

    logger.info(
        "CONNECT account.updated id=%s charges=%s payouts=%s",
        account_id,
        charges_enabled,
        payouts_enabled,
    )

    user = db.query(User).filter(User.stripe_account_id == account_id).first()
    if user:
        user.stripe_payouts_enabled = payouts_enabled
        user.stripe_charges_enabled = charges_enabled
        user.stripe_onboarding_complete = details_submitted or payouts_enabled or charges_enabled
        user.stripe_account_status = (
            STATUS_ACTIVE if payouts_enabled and charges_enabled else STATUS_PENDING
        )
        db.commit()
        logger.info("CONNECT user %s updated from webhook", user.id)
    else:
        logger.warning("CONNECT no user for account %s", account_id)

    mark_stripe_event_processed(db, event_id, "account.updated")
    db.commit()


def _handle_payout_event(db: Session, payout_obj: dict, event_type: str, event_id: str) -> None:
    payout_id = payout_obj.get("id") or ""
    amount_cents = int(payout_obj.get("amount") or 0)
    amount = Decimal(str(amount_cents)) / Decimal("100")
    metadata = payout_obj.get("metadata") or {}
    user_id_raw = metadata.get("user_id")

    logger.info("WEBHOOK %s payout_id=%s amount=$%s", event_type, payout_id, amount)

    if event_type == "payout.failed" and user_id_raw:
        try:
            user_id = int(user_id_raw)
            refund_marketplace_withdrawal(
                db,
                user_id=user_id,
                amount=amount,
                payout_id=payout_id,
            )
        except Exception as exc:
            logger.exception("Failed to refund marketplace withdrawal for payout %s: %s", payout_id, exc)

    mark_stripe_event_processed(db, event_id, event_type)
    db.commit()


def _handle_transfer_event(db: Session, transfer_obj: dict, event_type: str, event_id: str) -> None:
    transfer_id = transfer_obj.get("id") or ""
    amount_cents = int(transfer_obj.get("amount") or 0)
    destination = transfer_obj.get("destination") or ""
    metadata = transfer_obj.get("metadata") or {}
    offer_id = metadata.get("offer_id")

    logger.info(
        "WEBHOOK %s transfer_id=%s offer=%s amount_cents=%s destination=%s",
        event_type,
        transfer_id,
        offer_id,
        amount_cents,
        destination,
    )

    if event_type == "transfer.failed":
        logger.error(
            "TRANSFER FAILED transfer_id=%s offer=%s destination=%s",
            transfer_id,
            offer_id,
            destination,
        )

    mark_stripe_event_processed(db, event_id, event_type)
    db.commit()


@router.post("/stripe")
async def stripe_webhook(request: Request):
    logger.info("WEBHOOK reached")
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    secret = (STRIPE_WEBHOOK_SECRET or "").strip()

    if not secret:
        logger.error("STRIPE_WEBHOOK_SECRET is not configured")
        return JSONResponse(status_code=500, content={"detail": "Webhook secret not configured"})

    try:
        _configure_stripe()
        event = stripe.Webhook.construct_event(payload, sig_header, secret)
    except ValueError as exc:
        logger.warning("WEBHOOK invalid payload: %s", exc)
        return JSONResponse(status_code=400, content={"detail": "Invalid payload"})
    except stripe.error.SignatureVerificationError as exc:
        logger.warning("WEBHOOK signature verification failed: %s", exc)
        return JSONResponse(status_code=400, content={"detail": "Invalid signature"})

    event_dict = _as_stripe_dict(event)
    event_id = event_dict.get("id") or ""
    event_type = event_dict.get("type") or ""
    logger.info("WEBHOOK event type=%s id=%s", event_type, event_id)

    try:
        with Session(engine) as db:
            if stripe_event_already_processed(db, event_id):
                logger.info("WEBHOOK already processed: %s", event_id)
                return {"received": True, "duplicate": True}

            data = event_dict.get("data") or {}
            obj_dict = _as_stripe_dict(data.get("object"))

            if event_type == "checkout.session.completed":
                _handle_checkout_completed(db, obj_dict, event_id)
            elif event_type == "account.updated":
                _handle_account_updated(db, obj_dict, event_id)
            elif event_type in ("payout.paid", "payout.failed"):
                _handle_payout_event(db, obj_dict, event_type, event_id)
            elif event_type in ("transfer.created", "transfer.failed"):
                _handle_transfer_event(db, obj_dict, event_type, event_id)
            else:
                logger.info("WEBHOOK unhandled event type: %s", event_type)

        return {"received": True}
    except Exception as exc:
        logger.exception("WEBHOOK handler error: %s", exc)
        return JSONResponse(status_code=500, content={"detail": "Webhook handler error"})
