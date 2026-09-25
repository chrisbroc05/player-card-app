"""Credit balance, ledger, Stripe Checkout, and marketplace withdrawals."""

from __future__ import annotations

import logging
import traceback
from decimal import Decimal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from auth import get_current_user
from credit_service import (
    InsufficientCreditsError,
    get_balance,
    get_ledger,
)
from database import get_db
from email_service import send_withdrawal_confirmation_email
from marketplace_repo import float_from_decimal
from marketplace_service import (
    InsufficientMarketplaceBalanceError,
    get_marketplace_balance,
    initiate_marketplace_withdrawal,
    require_connect_account_for_marketplace,
)
from models import User
from parent_email_utils import parent_email_for_notify
from payments_config import MIN_CREDIT_LOAD, require_payments_enabled
from stripe_checkout import create_credit_checkout_session, create_marketplace_checkout_session

logger = logging.getLogger(__name__)

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
    card_bal = get_balance(db, user.id)
    marketplace_bal = get_marketplace_balance(db, user.id)
    return {
        "credit_balance": float_from_decimal(card_bal),
        "marketplace_balance": float_from_decimal(marketplace_bal),
    }


@router.get("/ledger")
def credits_ledger(
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    category: str | None = Query(default=None),
    balance_type: str | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_payments_enabled()
    rows = get_ledger(
        db,
        user.id,
        limit=limit,
        offset=offset,
        category=category,
        balance_type=balance_type,
    )
    return {
        "entries": rows,
        "limit": limit,
        "offset": offset,
        "category": category or "all",
        "balance_type": balance_type or "all",
    }


@router.post("/checkout")
def credits_checkout(
    body: CheckoutBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Load card-creation credits (direct charge to platform — not marketplace)."""
    require_payments_enabled()

    amt = Decimal(str(body.amount_dollars)).quantize(Decimal("0.01"))
    if amt < Decimal(str(MIN_CREDIT_LOAD)):
        raise HTTPException(
            status_code=400,
            detail=f"Minimum credit purchase is ${MIN_CREDIT_LOAD:.2f}",
        )

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


@router.post("/marketplace-checkout")
def marketplace_checkout(
    body: CheckoutBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Load marketplace spending balance (requires Stripe Connect account)."""
    require_payments_enabled()
    require_connect_account_for_marketplace(db, user)

    amt = Decimal(str(body.amount_dollars)).quantize(Decimal("0.01"))
    if amt < Decimal(str(MIN_CREDIT_LOAD)):
        raise HTTPException(
            status_code=400,
            detail=f"Minimum marketplace load is ${MIN_CREDIT_LOAD:.2f}",
        )

    recipient_id = user.id
    if body.recipient_user_id is not None:
        recipient = db.query(User).filter(User.id == body.recipient_user_id).first()
        if recipient is None:
            raise HTTPException(status_code=404, detail="Recipient user not found")
        recipient_id = recipient.id
        require_connect_account_for_marketplace(db, recipient)

    try:
        checkout_url = create_marketplace_checkout_session(
            purchaser_user_id=user.id,
            recipient_user_id=recipient_id,
            amount_dollars=amt,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e

    logger.info(
        "Marketplace checkout created for user %s recipient %s amount $%s",
        user.id,
        recipient_id,
        amt,
    )
    return {"checkout_url": checkout_url}


@router.post("/withdraw")
def credits_withdraw(
    body: WithdrawBody,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Withdraw marketplace earnings to connected bank via Stripe Express payout."""
    current_user = user
    payout_created = False

    try:
        logger.info(
            "WITHDRAW request user=%s amount=%s payouts_enabled=%s",
            current_user.id,
            body.amount_dollars,
            current_user.stripe_payouts_enabled,
        )
        require_payments_enabled()

        amt = Decimal(str(body.amount_dollars)).quantize(Decimal("0.01"))
        if amt < MIN_WITHDRAWAL_DOLLARS:
            raise HTTPException(status_code=400, detail="Minimum withdrawal is $5.00")

        try:
            row, payout_id = initiate_marketplace_withdrawal(db, current_user, amt)
            payout_created = True
            db.commit()
        except InsufficientMarketplaceBalanceError:
            db.rollback()
            raise HTTPException(status_code=400, detail="Insufficient marketplace balance") from None

        new_balance = float_from_decimal(row.balance_after)

        background_tasks.add_task(
            send_withdrawal_confirmation_email,
            current_user.email,
            current_user.display_name,
            float(amt),
            new_balance,
            parent_email=parent_email_for_notify(current_user),
        )

        return {
            "marketplace_balance": new_balance,
            "payout_id": payout_id,
            "message": "Withdrawal initiated — funds will arrive per your bank's payout schedule.",
        }
    except HTTPException:
        if payout_created:
            db.rollback()
        raise
    except Exception as e:
        if payout_created:
            db.rollback()
        logger.exception("WITHDRAW error: %s", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e)) from None
