"""Stripe Checkout session creation for credit top-ups and card creation."""

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
    extra_metadata: dict[str, str] | None = None,
    enforce_minimum: bool = True,
) -> dict[str, str]:
    amt = Decimal(str(amount_dollars)).quantize(Decimal("0.01"))
    if enforce_minimum and amt < _MIN_CHECKOUT_DOLLARS:
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
    if extra_metadata:
        metadata.update(extra_metadata)

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
    session_id = session.id
    if not url or not session_id:
        raise RuntimeError("Stripe did not return a checkout URL")
    return {"checkout_url": url, "session_id": session_id}


def create_credit_checkout_session(
    *,
    purchaser_user_id: int,
    recipient_user_id: int,
    amount_dollars: Decimal | float,
) -> str:
    """Create a Stripe Checkout session for card-creation credits (platform direct charge)."""
    amt = Decimal(str(amount_dollars)).quantize(Decimal("0.01"))
    label = f"${amt:.2f} in Prospect Legends credits"
    result = _create_checkout_session(
        purchaser_user_id=purchaser_user_id,
        recipient_user_id=recipient_user_id,
        amount_dollars=amt,
        fund_type="card",
        product_name="Prospect Legends Credits",
        product_description=label,
        success_path="/credits?success=true",
        cancel_path="/credits?cancelled=true",
    )
    return result["checkout_url"]


def create_marketplace_checkout_session(
    *,
    purchaser_user_id: int,
    recipient_user_id: int,
    amount_dollars: Decimal | float,
) -> str:
    """Create a Stripe Checkout session for marketplace balance (held on platform)."""
    amt = Decimal(str(amount_dollars)).quantize(Decimal("0.01"))
    label = f"${amt:.2f} in marketplace spending balance"
    result = _create_checkout_session(
        purchaser_user_id=purchaser_user_id,
        recipient_user_id=recipient_user_id,
        amount_dollars=amt,
        fund_type="marketplace",
        product_name="Prospect Legends Marketplace Funds",
        product_description=label,
        success_path="/credits?marketplace_success=true",
        cancel_path="/credits?marketplace_cancelled=true",
    )
    return result["checkout_url"]


def create_card_creation_checkout_session(
    *,
    purchaser_user_id: int,
    amount_dollars: Decimal | float,
    tier: str,
    card_type: str,
    copy_quantity: int,
    checkout_id: int,
    order_id: int,
    animated: bool = False,
) -> dict[str, str]:
    """Create a Stripe Checkout session for upfront card creation (platform direct charge)."""
    amt = Decimal(str(amount_dollars)).quantize(Decimal("0.01"))
    tier_label = (tier or "rookie").replace("_", " ").title()
    qty = max(1, int(copy_quantity))
    copy_word = "copy" if qty == 1 else "copies"
    ct = (card_type or "static").strip().lower()
    if ct == "highlight":
        label = f"{tier_label} Highlight — {qty} {copy_word} included"
    elif ct == "animated" or animated:
        label = f"{tier_label} Animated Card — {qty} {copy_word} included"
    else:
        label = f"{tier_label} Static Card — {qty} {copy_word} included"
    return _create_checkout_session(
        purchaser_user_id=purchaser_user_id,
        recipient_user_id=purchaser_user_id,
        amount_dollars=amt,
        fund_type="card_creation",
        product_name="Prospect Legends Card Creation",
        product_description=label,
        success_path="/studio?card_creation_success=true&session_id={CHECKOUT_SESSION_ID}",
        cancel_path="/studio?card_creation_cancelled=true",
        enforce_minimum=False,
        extra_metadata={
            "tier": (tier or "rookie").strip().lower(),
            "card_type": ct,
            "copy_quantity": str(qty),
            "animated": "true" if (animated or ct == "animated") else "false",
            "checkout_id": str(checkout_id),
            "order_id": str(order_id),
        },
    )


def create_card_creation_repick_session(
    *,
    purchaser_user_id: int,
    amount_dollars: Decimal | float,
    parent_session_id: str,
    checkout_id: int,
) -> dict[str, str]:
    """Stripe checkout for one additional paid preview ($1)."""
    amt = Decimal(str(amount_dollars)).quantize(Decimal("0.01"))
    return _create_checkout_session(
        purchaser_user_id=purchaser_user_id,
        recipient_user_id=purchaser_user_id,
        amount_dollars=amt,
        fund_type="card_creation_repick",
        product_name="Prospect Legends — Extra Preview",
        product_description="Generate one more card preview variation",
        success_path=(
            "/studio?card_creation_repick_success=true"
            f"&parent_session_id={parent_session_id}"
            "&session_id={CHECKOUT_SESSION_ID}"
        ),
        cancel_path=f"/studio?card_creation_repick_cancelled=true&parent_session_id={parent_session_id}",
        enforce_minimum=False,
        extra_metadata={
            "parent_session_id": parent_session_id,
            "checkout_id": str(checkout_id),
        },
    )
