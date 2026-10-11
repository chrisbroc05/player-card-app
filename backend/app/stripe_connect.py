"""Stripe Connect Express account helpers."""

from __future__ import annotations

import logging
import os

import stripe
from sqlalchemy.orm import Session

from models import User

logger = logging.getLogger(__name__)

STATUS_PENDING = "pending"
STATUS_ACTIVE = "active"
STATUS_RESTRICTED = "restricted"


def _stripe_secret_key() -> str:
    key = (os.environ.get("STRIPE_SECRET_KEY") or "").strip()
    if not key:
        raise RuntimeError("STRIPE_SECRET_KEY is not configured")
    return key


def _configure_stripe() -> None:
    stripe.api_key = _stripe_secret_key()


def configure_stripe_client() -> None:
    """Public helper to configure the shared Stripe client with env key."""
    _configure_stripe()


def _individual_prefill(user: User) -> dict:
    """Prefill Express individual onboarding from the app user profile."""
    individual: dict = {"email": user.email}
    name = (getattr(user, "display_name", None) or "").strip()
    if name:
        parts = name.split(None, 1)
        individual["first_name"] = parts[0]
        if len(parts) > 1:
            individual["last_name"] = parts[1]
    return individual


def _apply_individual_express_defaults(account_id: str, user: User) -> None:
    """Ensure Express accounts use individual (not business) onboarding before Stripe collects KYC."""
    try:
        account = stripe.Account.retrieve(account_id)
        if bool(getattr(account, "details_submitted", False)):
            return
        stripe.Account.modify(
            account_id,
            business_type="individual",
            individual=_individual_prefill(user),
        )
    except Exception as exc:
        logger.warning(
            "Could not pre-set individual business type on Connect account %s: %s",
            account_id,
            exc,
        )


def ensure_connect_account(db: Session, user: User) -> str:
    """Create or return existing Stripe Express Connect account id."""
    _configure_stripe()
    if user.stripe_account_id:
        _apply_individual_express_defaults(user.stripe_account_id, user)
        return user.stripe_account_id

    frontend = (os.environ.get("FRONTEND_URL") or "").strip().rstrip("/")
    if not frontend:
        raise RuntimeError("FRONTEND_URL is not configured")
    logger.info("Creating Stripe Connect Express account for user %s", user.id)
    account = stripe.Account.create(
        type="express",
        country="US",
        email=user.email,
        business_type="individual",
        individual=_individual_prefill(user),
        capabilities={
            "card_payments": {"requested": True},
            "transfers": {"requested": True},
        },
    )
    user.stripe_account_id = account.id
    user.stripe_account_status = STATUS_PENDING
    user.stripe_onboarding_complete = False
    user.stripe_charges_enabled = False
    user.stripe_payouts_enabled = False
    db.commit()
    db.refresh(user)
    logger.info("Connect account created: %s for user %s", account.id, user.id)
    return account.id


def _safe_return_path(path: str | None, default: str = "/credits") -> str:
    """Sanitize a frontend path for Stripe Account Link return/refresh URLs."""
    p = (path or default).strip()
    if not p.startswith("/") or p.startswith("//"):
        return default
    return p.split("?")[0].split("#")[0] or default


def create_onboarding_link(
    db: Session,
    user: User,
    *,
    return_path: str = "/credits",
    refresh_path: str | None = None,
) -> str:
    """Ensure Connect account exists and return a fresh Stripe Account Link URL."""
    stripe_account_id = ensure_connect_account(db, user)
    _configure_stripe()
    frontend = (os.environ.get("FRONTEND_URL") or "").strip().rstrip("/")
    if not frontend:
        raise RuntimeError("FRONTEND_URL is not configured")

    safe_return = _safe_return_path(return_path)
    safe_refresh = _safe_return_path(refresh_path, safe_return)

    _apply_individual_express_defaults(stripe_account_id, user)
    account = stripe.Account.retrieve(stripe_account_id)
    details_submitted = bool(getattr(account, "details_submitted", False))
    link_type = "account_update" if details_submitted else "account_onboarding"

    link = stripe.AccountLink.create(
        account=stripe_account_id,
        refresh_url=f"{frontend}{safe_refresh}?connect=refresh",
        return_url=f"{frontend}{safe_return}?connect=complete",
        type=link_type,
    )
    url = link.url
    if not url:
        raise RuntimeError("Stripe did not return an onboarding URL")
    return url


def connect_status_payload(user: User) -> dict[str, bool | str | None]:
    return {
        "stripe_connect_account_id": user.stripe_account_id,
        "stripe_account_id": user.stripe_account_id,
        "stripe_account_status": user.stripe_account_status,
        "stripe_onboarding_complete": bool(user.stripe_onboarding_complete),
        "stripe_charges_enabled": bool(getattr(user, "stripe_charges_enabled", False)),
        "stripe_payouts_enabled": bool(user.stripe_payouts_enabled),
        "charges_enabled": bool(getattr(user, "stripe_charges_enabled", False)),
        "payouts_enabled": bool(user.stripe_payouts_enabled),
    }


def sync_connect_account_status(db: Session, user: User) -> dict[str, bool | str | None]:
    """Fetch live Stripe Connect status and persist on user."""
    if not user.stripe_account_id:
        return connect_status_payload(user)

    try:
        _configure_stripe()
        account = stripe.Account.retrieve(user.stripe_account_id)
        payouts_enabled = bool(getattr(account, "payouts_enabled", False))
        charges_enabled = bool(getattr(account, "charges_enabled", False))
        details_submitted = bool(getattr(account, "details_submitted", False))

        user.stripe_payouts_enabled = payouts_enabled
        user.stripe_charges_enabled = charges_enabled
        if payouts_enabled and charges_enabled:
            user.stripe_account_status = STATUS_ACTIVE
        elif details_submitted:
            user.stripe_account_status = STATUS_PENDING
        else:
            user.stripe_account_status = STATUS_PENDING
        user.stripe_onboarding_complete = details_submitted or payouts_enabled or charges_enabled
        db.commit()
        db.refresh(user)
        logger.info(
            "Connect status synced for user %s: charges=%s payouts=%s",
            user.id,
            charges_enabled,
            payouts_enabled,
        )
    except Exception as exc:
        logger.warning(
            "Failed to sync Stripe Connect status for user %s: %s",
            user.id,
            exc,
        )
        db.rollback()

    return connect_status_payload(user)


def create_dashboard_link(user: User) -> str:
    """Return Stripe Express dashboard login URL."""
    if not user.stripe_account_id:
        raise ValueError("No Stripe Connect account")
    if not user.stripe_onboarding_complete:
        raise ValueError("Stripe onboarding not complete")

    _configure_stripe()
    link = stripe.Account.create_login_link(user.stripe_account_id)
    url = link.url
    if not url:
        raise RuntimeError("Stripe did not return a dashboard URL")
    return url
