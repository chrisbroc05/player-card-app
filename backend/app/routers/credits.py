"""Credit balance, ledger, and Stripe Checkout."""

from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from auth import get_current_user
from credit_service import get_balance, get_ledger
from database import get_db
from marketplace_repo import float_from_decimal
from models import User
from payments_config import require_payments_enabled
from stripe_checkout import MIN_CHECKOUT_DOLLARS, create_credit_checkout_session

router = APIRouter()


class CheckoutBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    amount_dollars: float = Field(..., gt=0)
    recipient_user_id: int | None = Field(default=None)


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
