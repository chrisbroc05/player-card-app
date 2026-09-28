"""Beta signup free card creation tokens."""

from __future__ import annotations

from uuid import uuid4

from beta_config import beta_signup_free_card_token_count
from card_pricing import card_creation_quote
from credit_service import record_free_beta_card_token_usage
from models import CardCreationCheckout, User, utcnow


def grant_signup_free_card_tokens(db, user: User) -> int:
    """Grant the standard beta signup token bundle. Returns tokens granted."""
    count = beta_signup_free_card_token_count()
    if count <= 0:
        return 0
    granted = int(getattr(user, "free_card_tokens_granted", 0) or 0)
    remaining = int(getattr(user, "free_card_tokens", 0) or 0)
    user.free_card_tokens_granted = granted + count
    user.free_card_tokens = remaining + count
    return count


def card_creation_charge_with_free_token(
    tier: str | None,
    *,
    card_type: str = "static",
    animated: bool = False,
    free_tokens_available: int,
    copy_quantity: int = 1,
) -> dict:
    """
    Compute Stripe charge when free tokens may cover the base tier price.

    Each token covers one copy. Tokens apply only when copy_quantity <= available
    tokens (no mixing free tokens and payment in one order).
    """
    quote = card_creation_quote(tier, card_type=card_type, animated=animated)
    tokens = max(0, int(free_tokens_available or 0))
    qty = max(1, int(copy_quantity or 1))

    if tokens <= 0 or qty > tokens:
        return {
            **quote,
            "free_token_applied": False,
            "base_covered_by_token": False,
            "charge_total": quote["total"],
            "tokens_to_consume": 0,
        }

    charge = round(float(quote.get("highlight_fee", 0)) + float(quote.get("animated_fee", 0)), 2)
    return {
        **quote,
        "free_token_applied": True,
        "base_covered_by_token": True,
        "charge_total": charge,
        "tokens_to_consume": qty,
    }


def new_free_token_session_id(checkout_id: int) -> str:
    return f"free_token_{checkout_id}_{uuid4().hex[:16]}"


def consume_free_card_token_after_success(
    db,
    *,
    user_id: int,
    checkout: CardCreationCheckout,
) -> int | None:
    """Deduct free tokens equal to copy_quantity after card generation completes."""
    if not checkout.paid_with_free_token or checkout.free_token_consumed:
        return None
    tokens_to_use = max(1, int(checkout.copy_quantity or 1))
    user = db.query(User).filter(User.id == user_id).with_for_update().first()
    if user is None:
        raise ValueError(f"User not found: {user_id}")
    remaining = int(getattr(user, "free_card_tokens", 0) or 0)
    if remaining < tokens_to_use:
        raise ValueError("Not enough free card tokens remaining")
    user.free_card_tokens = remaining - tokens_to_use
    checkout.free_token_consumed = True
    checkout.updated_at = utcnow()
    new_remaining = user.free_card_tokens
    record_free_beta_card_token_usage(
        db,
        user_id=user_id,
        tokens_used=tokens_to_use,
        remaining=new_remaining,
        reference_id=checkout.stripe_session_id or str(checkout.id),
    )
    return new_remaining
