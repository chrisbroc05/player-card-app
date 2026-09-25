"""Card creation Stripe checkout and webhook fulfillment."""

from __future__ import annotations

import logging
import threading
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from card_pricing import card_creation_quote, normalize_card_type, normalize_order_tier
from models import CardCreationCheckout, User, utcnow
from payments_config import require_payments_enabled
from stripe_checkout import create_card_creation_checkout_session

logger = logging.getLogger(__name__)

COPY_QTY_MIN = 1
COPY_QTY_MAX = 100


def _validate_copy_quantity(qty: int) -> int:
    q = int(qty)
    if q < COPY_QTY_MIN or q > COPY_QTY_MAX:
        raise ValueError(f"Copy quantity must be between {COPY_QTY_MIN} and {COPY_QTY_MAX}.")
    return q


def begin_card_creation_checkout(
    db: Session,
    *,
    user: User,
    order_id: int,
    order_snapshot: dict,
    copy_quantity: int,
    card_type: str = "static",
    animated: bool = False,
    highlight_staging: dict | None = None,
) -> dict:
    """Persist checkout state and return Stripe Checkout URL."""
    require_payments_enabled()
    qty = _validate_copy_quantity(copy_quantity)
    tier = normalize_order_tier(order_snapshot.get("tier"))
    ct = normalize_card_type(card_type)
    if ct == "highlight":
        animated = False
    elif ct == "animated":
        animated = True
    quote = card_creation_quote(tier, card_type=ct, animated=animated)
    amount = Decimal(str(quote["total"])).quantize(Decimal("0.01"))

    snapshot = dict(order_snapshot)
    if ct == "highlight":
        snapshot["card_type"] = "highlight"
    else:
        snapshot["card_type"] = "standard"
    snapshot["checkout_card_type"] = ct
    snapshot["checkout_animated"] = bool(animated or ct == "animated")
    if highlight_staging:
        snapshot["highlight_staging"] = highlight_staging

    checkout = CardCreationCheckout(
        user_id=user.id,
        order_id=order_id,
        order_snapshot=snapshot,
        tier=tier,
        card_type=ct,
        animated=bool(animated),
        copy_quantity=qty,
        amount_dollars=amount,
        status="pending",
    )
    db.add(checkout)
    db.flush()

    try:
        stripe_result = create_card_creation_checkout_session(
            purchaser_user_id=user.id,
            amount_dollars=amount,
            tier=tier,
            card_type=ct,
            copy_quantity=qty,
            checkout_id=checkout.id,
            order_id=order_id,
            animated=bool(animated),
        )
    except (ValueError, RuntimeError) as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    checkout.stripe_session_id = stripe_result["session_id"]
    db.commit()
    db.refresh(checkout)
    return {
        "checkout_id": checkout.id,
        "checkout_url": stripe_result["checkout_url"],
        "session_id": stripe_result["session_id"],
        "amount_dollars": float(amount),
        "tier": tier,
        "card_type": ct,
        "animated": bool(animated),
        "copy_quantity": qty,
        "quote": quote,
    }


def get_card_creation_checkout_status(
    db: Session,
    *,
    user_id: int,
    session_id: str,
) -> dict:
    sid = (session_id or "").strip()
    if not sid:
        raise HTTPException(status_code=400, detail="session_id is required")
    row = (
        db.query(CardCreationCheckout)
        .filter(
            CardCreationCheckout.stripe_session_id == sid,
            CardCreationCheckout.user_id == user_id,
        )
        .first()
    )
    if row is None:
        return {"status": "not_found"}
    return {
        "status": row.status,
        "checkout_id": row.id,
        "order_id": row.order_id,
        "copy_quantity": row.copy_quantity,
        "tier": row.tier,
        "card_type": row.card_type,
        "animated": row.animated,
        "amount_dollars": float(row.amount_dollars),
        "result_card_id": row.result_card_id,
        "error_message": row.error_message,
    }


def fulfill_card_creation_from_webhook(db: Session, session: dict) -> None:
    """Idempotent fulfillment after checkout.session.completed for fund_type=card_creation."""
    metadata = session.get("metadata") or {}
    session_id = (session.get("id") or "").strip()
    checkout_id = int(metadata.get("checkout_id") or 0)
    user_id = int(metadata.get("user_id") or 0)
    tier = normalize_order_tier(metadata.get("tier"))
    card_type = normalize_card_type(metadata.get("card_type"))
    animated_raw = (metadata.get("animated") or "false").strip().lower()
    animated = card_type == "animated" or animated_raw in ("true", "1", "yes")
    copy_quantity = int(metadata.get("copy_quantity") or 1)
    amount = Decimal(str(metadata.get("amount_dollars") or "0"))

    row = None
    if checkout_id:
        row = db.query(CardCreationCheckout).filter(CardCreationCheckout.id == checkout_id).first()
    if row is None and session_id:
        row = (
            db.query(CardCreationCheckout)
            .filter(CardCreationCheckout.stripe_session_id == session_id)
            .first()
        )
    if row is None:
        raise ValueError(f"Card creation checkout not found for session {session_id}")

    if row.status == "completed":
        logger.info("Card creation checkout %s already completed", row.id)
        return

    if row.user_id != user_id:
        raise ValueError("Checkout user mismatch")

    row.stripe_session_id = session_id or row.stripe_session_id
    row.status = "processing"
    row.updated_at = utcnow()
    db.flush()

    try:
        from main import fulfill_paid_card_creation

        card_id = fulfill_paid_card_creation(
            db,
            user_id=user_id,
            order_snapshot=row.order_snapshot,
            copy_quantity=copy_quantity or row.copy_quantity,
            stripe_session_id=session_id,
            amount_dollars=amount or row.amount_dollars,
            tier=tier or row.tier,
            card_type=card_type or row.card_type,
            animated=animated or row.animated,
        )
        row.result_card_id = card_id
        row.status = "completed"
        row.error_message = None
        logger.info(
            "Card creation fulfilled checkout=%s user=%s card=%s type=%s animated=%s copies=%s",
            row.id,
            user_id,
            card_id,
            card_type or row.card_type,
            animated or row.animated,
            copy_quantity or row.copy_quantity,
        )
    except Exception as exc:
        logger.exception("Card creation fulfillment failed for checkout %s", row.id)
        row.status = "failed"
        row.error_message = str(exc)[:500]
        raise
    finally:
        row.updated_at = utcnow()
