"""Credit balance, ledger, Stripe Checkout, and withdrawals."""

from __future__ import annotations

import os
import traceback
from decimal import Decimal

import stripe
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from auth import get_current_user
from credit_service import (
    InsufficientCreditsError,
    TX_WITHDRAWAL,
    deduct_credits,
    get_balance,
    get_ledger,
)
from database import get_db
from email_service import send_withdrawal_confirmation_email
from marketplace_repo import float_from_decimal
from models import User
from parent_email_utils import parent_email_for_notify
from payments_config import require_payments_enabled
from stripe_checkout import MIN_CHECKOUT_DOLLARS, create_credit_checkout_session

router = APIRouter()

MIN_WITHDRAWAL_DOLLARS = Decimal("5.00")


@router.get("/test")
def credits_router_test():
    """Temporary reachability check — confirms router is mounted at /credits/test."""
    return {"status": "credits router reachable"}


class CheckoutBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    amount_dollars: float = Field(..., gt=0)
    recipient_user_id: int | None = Field(default=None)


class WithdrawBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    amount_dollars: float = Field(..., gt=0)


@router.get("/balance")
def credits_balance(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_payments_enabled()
    bal = get_balance(db, user.id)
    return {"credit_balance": float_from_decimal(bal)}


@router.get("/ledger")
def credits_ledger(
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_payments_enabled()
    rows = get_ledger(db, user.id, limit=limit, offset=offset)
    return {"entries": rows, "limit": limit, "offset": offset}


@router.post("/checkout")
def credits_checkout(
    body: CheckoutBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_payments_enabled()

    amt = Decimal(str(body.amount_dollars)).quantize(Decimal("0.01"))
    if amt < MIN_CHECKOUT_DOLLARS:
        raise HTTPException(status_code=400, detail="Minimum checkout amount is $5.00")

    recipient_id = user.id
    if body.recipient_user_id is not None:
        recipient = db.query(User).filter(User.id == body.recipient_user_id).first()
        if recipient is None:
            raise HTTPException(status_code=404, detail="Recipient user not found")
        recipient_id = recipient.id

    try:
        checkout_url = create_credit_checkout_session(
            purchaser_user_id=user.id,
            recipient_user_id=recipient_id,
            amount_dollars=amt,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e

    return {"checkout_url": checkout_url}


@router.post("/withdraw")
def credits_withdraw(
    body: WithdrawBody,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    amount_dollars = body.amount_dollars
    current_user = user
    credits_deducted = False

    try:
        print("WITHDRAW - endpoint hit", flush=True)
        print(f"WITHDRAW - amount: {amount_dollars}", flush=True)
        print(f"WITHDRAW - user: {current_user.id}", flush=True)
        print(
            f"WITHDRAW - stripe enabled: {current_user.stripe_payouts_enabled}",
            flush=True,
        )
        print(
            f"WITHDRAW - stripe account: {current_user.stripe_account_id is not None}",
            flush=True,
        )
        print(f"WITHDRAW - balance: {current_user.credit_balance}", flush=True)

        require_payments_enabled()

        if not current_user.stripe_payouts_enabled:
            raise HTTPException(
                status_code=400,
                detail="No payout account connected. Please connect your bank account first.",
            )

        stripe_account_id = (current_user.stripe_account_id or "").strip()
        if not stripe_account_id:
            raise HTTPException(
                status_code=400,
                detail="No payout account connected. Please connect your bank account first.",
            )

        amt = Decimal(str(amount_dollars)).quantize(Decimal("0.01"))
        if amt < MIN_WITHDRAWAL_DOLLARS:
            raise HTTPException(status_code=400, detail="Minimum withdrawal is $5.00")

        try:
            row = deduct_credits(
                current_user.id,
                amt,
                TX_WITHDRAWAL,
                note="Withdrawal to connected bank account",
                db=db,
                commit=False,
            )
        except InsufficientCreditsError:
            db.rollback()
            raise HTTPException(status_code=400, detail="Insufficient credits") from None

        credits_deducted = True
        new_balance = float_from_decimal(row.balance_after)
        amount_cents = int(amt * 100)

        stripe.api_key = (os.environ.get("STRIPE_SECRET_KEY") or "").strip()
        if not stripe.api_key:
            raise RuntimeError("STRIPE_SECRET_KEY is not configured")

        print("WITHDRAW - calling stripe transfer", flush=True)
        stripe.Transfer.create(
            amount=amount_cents,
            currency="usd",
            destination=stripe_account_id,
            transfer_group=f"withdrawal_{current_user.id}",
        )
        print("WITHDRAW - transfer success", flush=True)

        print("WITHDRAW - calling stripe payout", flush=True)
        stripe.Payout.create(
            amount=amount_cents,
            currency="usd",
            stripe_account=stripe_account_id,
        )
        print("WITHDRAW - payout success", flush=True)

        db.commit()

        background_tasks.add_task(
            send_withdrawal_confirmation_email,
            current_user.email,
            current_user.display_name,
            float(amt),
            new_balance,
            parent_email=parent_email_for_notify(current_user),
        )

        return {"credit_balance": new_balance, "message": "Withdrawal initiated"}
    except HTTPException:
        if credits_deducted:
            db.rollback()
        raise
    except Exception as e:
        if credits_deducted:
            db.rollback()
        print("WITHDRAW ERROR:", type(e).__name__, str(e), flush=True)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e)) from None
