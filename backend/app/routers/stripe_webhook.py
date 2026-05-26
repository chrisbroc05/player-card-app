"""Stripe webhook handler."""

from __future__ import annotations

import logging
import os
import traceback
from decimal import Decimal

import stripe
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from database import engine
from models import CreditLedger, User

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
        webhook_secret = (os.environ.get("STRIPE_WEBHOOK_SECRET") or "").strip()

        print("WEBHOOK - verifying signature", flush=True)
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        except Exception as e:
            print(f"WEBHOOK signature failed: {e}", flush=True)
            return JSONResponse(status_code=400, content={"error": str(e)})
        print("WEBHOOK - signature verified", flush=True)

        print("WEBHOOK - event type:", event["type"], flush=True)

        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            print("WEBHOOK - metadata:", session.get("metadata"), flush=True)

            metadata = session.get("metadata", {})
            user_id = int(metadata.get("user_id"))
            amount_dollars = float(metadata.get("amount_dollars"))
            recipient_user_id = metadata.get("recipient_user_id")

            if not recipient_user_id:
                recipient_user_id = None
            else:
                recipient_user_id = int(recipient_user_id)

            target_user_id = recipient_user_id if recipient_user_id else user_id
            session_id = session.get("id")
            amount = Decimal(str(amount_dollars)).quantize(Decimal("0.01"))
            tx_type = "gift" if target_user_id != user_id else "top_up"

            print("WEBHOOK - calling add_credits", flush=True)
            new_balance = None

            with Session(engine) as db:
                existing = (
                    db.query(CreditLedger.id)
                    .filter(
                        CreditLedger.reference_id == session_id,
                        CreditLedger.amount > Decimal("0.00"),
                    )
                    .first()
                )
                if existing:
                    print(f"WEBHOOK - session already processed: {session_id}", flush=True)
                    return {"received": True}

                user = db.query(User).filter(User.id == target_user_id).first()
                if not user:
                    print(f"WEBHOOK ERROR: user {target_user_id} not found", flush=True)
                    return {"received": True}

                current_balance = Decimal(str(user.credit_balance or Decimal("0.00")))
                user.credit_balance = current_balance + amount
                new_balance = user.credit_balance

                ledger_entry = CreditLedger(
                    user_id=target_user_id,
                    amount=amount,
                    balance_after=user.credit_balance,
                    transaction_type=tx_type,
                    reference_id=session_id,
                    note="Credits loaded via Stripe",
                )
                db.add(ledger_entry)
                print("WEBHOOK - committing db", flush=True)
                db.commit()
                print("WEBHOOK - add_credits complete", flush=True)

            print(
                f"WEBHOOK SUCCESS: added ${amount_dollars} to user {target_user_id}, "
                f"new balance: {new_balance}",
                flush=True,
            )
            print("WEBHOOK - done", flush=True)

        return {"received": True}
    except Exception as e:
        print("WEBHOOK ERROR:", str(e), flush=True)
        traceback.print_exc()
        return JSONResponse(status_code=200, content={"status": "error logged"})
