"""Stripe webhook handler."""

from __future__ import annotations

import logging
import os
import traceback

import stripe
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from credit_service import InvalidCreditAmountError, UserNotFoundError, apply_stripe_checkout_credits
from database import engine

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/test")
def webhook_router_test():
    """Temporary reachability check — confirms router is mounted at /webhooks/test."""
    return {"status": "webhook router is reachable"}


@router.post("/stripe")
async def stripe_webhook(request: Request):
    print("WEBHOOK HIT - stripe webhook endpoint reached", flush=True)

    try:
        payload = await request.body()
        sig_header = request.headers.get("stripe-signature")
        secret = (os.environ.get("STRIPE_WEBHOOK_SECRET") or "").strip()
        if not secret:
            logger.error("STRIPE_WEBHOOK_SECRET is not configured")
            raise HTTPException(status_code=400, detail="Webhook not configured")

        print("WEBHOOK - verifying signature", flush=True)
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, secret)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid payload") from None
        except stripe.error.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid signature") from None
        print("WEBHOOK - signature verified", flush=True)

        print("WEBHOOK - event type:", event["type"], flush=True)

        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            print("WEBHOOK - metadata:", session.get("metadata"), flush=True)

            session_id = session.get("id") or ""
            metadata = session.get("metadata") or {}

            user_id = int(metadata.get("user_id"))
            amount_dollars = float(metadata.get("amount_dollars"))
            recipient_user_id = metadata.get("recipient_user_id")
            if recipient_user_id:
                recipient_user_id = int(recipient_user_id)
            else:
                recipient_user_id = None

            recipient_id = recipient_user_id if recipient_user_id is not None else user_id

            print("WEBHOOK - calling add_credits", flush=True)
            with Session(engine) as db:
                apply_stripe_checkout_credits(
                    db,
                    session_id=session_id,
                    purchaser_user_id=user_id,
                    recipient_user_id=recipient_id,
                    amount_dollars=amount_dollars,
                )
                print("WEBHOOK - add_credits complete", flush=True)
                print("WEBHOOK - committing db", flush=True)
                db.commit()
            print("WEBHOOK - done", flush=True)

        return {"received": True}
    except HTTPException:
        raise
    except (InvalidCreditAmountError, UserNotFoundError) as e:
        print("WEBHOOK ERROR:", str(e), flush=True)
        traceback.print_exc()
        return JSONResponse(status_code=200, content={"status": "error logged"})
    except Exception as e:
        print("WEBHOOK ERROR:", str(e), flush=True)
        traceback.print_exc()
        return JSONResponse(status_code=200, content={"status": "error logged"})
