"""Stripe Checkout session creation for credit top-ups."""

from __future__ import annotations

import os
from decimal import Decimal

import stripe

from email_service import frontend_url
from payments_config import MIN_CREDIT_LOAD

_MIN_CHECKOUT_DOLLARS = Decimal(str(MIN_CREDIT_LOAD))


def _stripe_secret_key() -> str:
    key = (os.environ.get("STRIPE_SECRET_KEY") or "").strip()
    if not key:
        raise RuntimeError("STRIPE_SECRET_KEY is not configured")
    return key


def _create_checkout_session(
    *,
    purchaser_user_id: int,
    recipient_user_id: int,
    amount_dollars: Decimal | float,
    fund_type: str,
    product_name: str,
    product_description: str,
    success_path: str,
    cancel_path: str,
) -> str:
    amt = Decimal(str(amount_dollars)).quantize(Decimal("0.01"))
    if amt < _MIN_CHECKOUT_DOLLARS:
        raise ValueError(f"Minimum purchase is ${MIN_CREDIT_LOAD:.2f}")

    stripe.api_key = _stripe_secret_key()
    cents = int(amt * 100)
    base = frontend_url()

    metadata = {
        "user_id": str(purchaser_user_id),
        "recipient_user_id": str(recipient_user_id) if recipient_user_id != purchaser_user_id else "",
        "amount_dollars": f"{amt:.2f}",
        "fund_type": fund_type,
    }

    session = stripe.checkout.Session.create(
        mode="payment",
        payment_method_types=["card"],
        line_items=[
            {
                "price_data": {
                    "currency": "usd",
                    "unit_amount": cents,
                    "product_data": {
                        "name": product_name,
                        "description": product_description,
                    },
                },
                "quantity": 1,
            }
        ],
        success_url=f"{base}{success_path}",
        cancel_url=f"{base}{cancel_path}",
        metadata=metadata,
    )
    url = session.url
    if not url:
        raise RuntimeError("Stripe did not return a checkout URL")
    return url


def create_credit_checkout_session(
    *,
    purchaser_user_id: int,
    recipient_user_id: int,
    amount_dollars: Decimal | float,
) -> str:
    """Create a Stripe Checkout session for card-creation credits (platform direct charge)."""
    amt = Decimal(str(amount_dollars)).quantize(Decimal("0.01"))
    label = f"${amt:.2f} in Prospect Legends credits"
    return _create_checkout_session(
        purchaser_user_id=purchaser_user_id,
        recipient_user_id=recipient_user_id,
        amount_dollars=amt,
        fund_type="card",
        product_name="Prospect Legends Credits",
        product_description=label,
        success_path="/credits?success=true",
        cancel_path="/credits?cancelled=true",
    )


def create_marketplace_checkout_session(
    *,
    purchaser_user_id: int,
    recipient_user_id: int,
    amount_dollars: Decimal | float,
) -> str:
    """Create a Stripe Checkout session for marketplace balance (held on platform)."""
    amt = Decimal(str(amount_dollars)).quantize(Decimal("0.01"))
    label = f"${amt:.2f} in marketplace spending balance"
    return _create_checkout_session(
        purchaser_user_id=purchaser_user_id,
        recipient_user_id=recipient_user_id,
        amount_dollars=amt,
        fund_type="marketplace",
        product_name="Prospect Legends Marketplace Funds",
        product_description=label,
        success_path="/credits?marketplace_success=true",
        cancel_path="/credits?marketplace_cancelled=true",
    )
