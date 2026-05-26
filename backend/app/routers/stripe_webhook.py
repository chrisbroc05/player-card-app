"""Stripe webhook handler."""

from __future__ import annotations

import os
import sys
import traceback

import stripe
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from database import engine
from models import CreditLedger, User

STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET")

router = APIRouter()


@router.get("/test")
def webhook_router_test():
    """Temporary reachability check — confirms router is mounted at /webhooks/test."""
    return {"status": "webhook router is reachable"}


@router.post("/stripe")
async def stripe_webhook(request: Request):
    print("WEBHOOK REACHED", flush=True)
    print("WEBHOOK SECRET LOADED:", STRIPE_WEBHOOK_SECRET is not None, flush=True)

    try:
        payload = await request.body()
        sig_header = request.headers.get("stripe-signature")

        print("WEBHOOK - verifying signature", flush=True)
        event = stripe.Webhook.construct_event(
            payload,
            sig_header,
            os.environ.get("STRIPE_WEBHOOK_SECRET"),
        )
        print("WEBHOOK - event type:", event.type, flush=True)

        if event.type == "checkout.session.completed":
            session = event["data"]["object"]._to_dict_recursive()
            metadata = session.get("metadata") or {}

            print("WEBHOOK - metadata:", metadata, flush=True)

            user_id = int(metadata.get("user_id"))
            amount = float(metadata.get("amount_dollars"))
            recipient = metadata.get("recipient_user_id")
            target_id = int(recipient) if recipient else user_id

            print(f"WEBHOOK - crediting user {target_id} with ${amount}", flush=True)

            with Session(engine) as db:
                user = db.query(User).filter(User.id == target_id).first()

                print(f"WEBHOOK - user found: {user is not None}", flush=True)

                if user:
                    current = float(user.credit_balance or 0)
                    new_balance = current + amount
                    user.credit_balance = new_balance

                    entry = CreditLedger(
                        user_id=target_id,
                        amount=amount,
                        balance_after=new_balance,
                        transaction_type="top_up",
                        reference_id=session.get("id"),
                        note="Credits loaded via Stripe",
                    )
                    db.add(entry)
                    db.commit()

                    print(f"WEBHOOK SUCCESS - new balance: {new_balance}", flush=True)

        return {"received": True}

    except Exception as e:
        print("WEBHOOK ERROR:", type(e).__name__, str(e), flush=True)
        print("WEBHOOK EXCEPTION TYPE:", type(e).__name__, flush=True)
        print("WEBHOOK EXCEPTION MESSAGE:", str(e), flush=True)
        print("WEBHOOK FULL TRACEBACK:", flush=True)
        traceback.print_exc(file=sys.stdout)
        sys.stdout.flush()
        return JSONResponse(status_code=200, content={"status": "error logged"})
