"""Stripe webhook handler."""

from __future__ import annotations

import logging
import os
import traceback

import stripe
from fastapi import APIRouter, HTTPException, Request
from sqlalchemy.orm import Session

from credit_service import InvalidCreditAmountError, UserNotFoundError, apply_stripe_checkout_credits
from database import engine

logger = logging.getLogger(__name__)

router = APIRouter()


def _log(step: str, **details) -> None:
    msg = f"[stripe webhook] {step}"
    if details:
        msg = f"{msg} | {details}"
    logger.info(msg)
    print(msg, flush=True)


def _session_metadata(session: object) -> dict:
    if isinstance(session, dict):
        raw = session.get("metadata") or {}
    elif hasattr(session, "get"):
        raw = session.get("metadata") or {}
    else:
        raw = getattr(session, "metadata", None) or {}
    if raw is None:
        return {}
    if isinstance(raw, dict):
        return raw
    return dict(raw)


def _session_id(session: object) -> str:
    if isinstance(session, dict):
        return str(session.get("id") or "")
    if hasattr(session, "get"):
        return str(session.get("id") or "")
    return str(getattr(session, "id", "") or "")


@router.post("/stripe")
async def stripe_webhook(request: Request):
    _log("endpoint hit")

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

    event_type = event.get("type") if hasattr(event, "get") else getattr(event, "type", None)
    _log("event received", event_type=event_type)

    if event_type == "checkout.session.completed":
        session = event["data"]["object"]
        try:
            with Session(engine) as db:
                _handle_checkout_completed(db, session)
                db.commit()
                _log("database commit completed")
        except Exception:
            tb = traceback.format_exc()
            logger.exception("Stripe checkout.session.completed handler failed")
            print(f"[stripe webhook] EXCEPTION:\n{tb}", flush=True)

    return {"received": True}


def _handle_checkout_completed(db: Session, session: object) -> None:
    session_id = _session_id(session)
    metadata = _session_metadata(session)
    _log("session metadata extracted", session_id=session_id, metadata=metadata)

    if not session_id:
        _log("aborting: missing session id")
        return

    try:
        user_id = int(metadata.get("user_id"))
        amount_dollars = float(metadata.get("amount_dollars"))
    except (TypeError, ValueError) as e:
        _log("aborting: invalid user_id or amount_dollars", error=str(e), metadata=metadata)
        return

    recipient_user_id = metadata.get("recipient_user_id")
    if recipient_user_id:
        try:
            recipient_user_id = int(recipient_user_id)
        except (TypeError, ValueError):
            _log("invalid recipient_user_id, treating as self top-up", raw=metadata.get("recipient_user_id"))
            recipient_user_id = None
    else:
        recipient_user_id = None

    recipient_id = recipient_user_id if recipient_user_id is not None else user_id
    _log(
        "calling apply_stripe_checkout_credits",
        user_id=user_id,
        recipient_id=recipient_id,
        amount_dollars=amount_dollars,
        session_id=session_id,
    )

    try:
        apply_stripe_checkout_credits(
            db,
            session_id=session_id,
            purchaser_user_id=user_id,
            recipient_user_id=recipient_id,
            amount_dollars=amount_dollars,
        )
        _log("apply_stripe_checkout_credits finished", session_id=session_id)
    except (InvalidCreditAmountError, UserNotFoundError) as e:
        _log("apply_stripe_checkout_credits failed", session_id=session_id, error=str(e))
        raise
