"""Stripe webhook handler."""

from __future__ import annotations

import logging
import os

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from credit_service import InvalidCreditAmountError, UserNotFoundError, apply_stripe_checkout_credits
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    secret = (os.environ.get("STRIPE_WEBHOOK_SECRET") or "").strip()
    if not secret:
        logger.error("STRIPE_WEBHOOK_SECRET is not configured")
        raise HTTPException(status_code=400, detail="Webhook not configured")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, secret)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload") from None
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature") from None

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        try:
            _handle_checkout_completed(db, session)
        except Exception:
            logger.exception("Stripe checkout.session.completed handler failed")

    return {"received": True}


def _handle_checkout_completed(db: Session, session: dict) -> None:
    metadata = session.get("metadata") or {}
    session_id = session.get("id") or ""
    if not session_id:
        return

    try:
        purchaser_id = int(metadata.get("user_id") or "0")
    except ValueError:
        logger.error("Stripe session %s missing valid user_id metadata", session_id)
        return

    recipient_raw = (metadata.get("recipient_user_id") or "").strip()
    if recipient_raw:
        try:
            recipient_id = int(recipient_raw)
        except ValueError:
            recipient_id = purchaser_id
    else:
        recipient_id = purchaser_id

    amount_raw = metadata.get("amount_dollars") or "0"
    try:
        amount = float(amount_raw)
    except ValueError:
        logger.error("Stripe session %s invalid amount_dollars metadata", session_id)
        return

    try:
        apply_stripe_checkout_credits(
            db,
            session_id=session_id,
            purchaser_user_id=purchaser_id,
            recipient_user_id=recipient_id,
            amount_dollars=amount,
        )
    except (InvalidCreditAmountError, UserNotFoundError) as e:
        logger.error("Stripe credit apply failed for %s: %s", session_id, e)
