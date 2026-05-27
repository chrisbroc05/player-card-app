"""Stripe Connect Express account helpers."""

from __future__ import annotations

import os

import stripe
from sqlalchemy.orm import Session

from models import User

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


def ensure_connect_account(db: Session, user: User) -> str:
    """Create or return existing Stripe Express Connect account id."""
    if user.stripe_account_id:
        return user.stripe_account_id

    _configure_stripe()
    frontend = (os.environ.get("FRONTEND_URL") or "").strip().rstrip("/")
    if not frontend:
        raise RuntimeError("FRONTEND_URL is not configured")
    account = stripe.Account.create(
        type="express",
        country="US",
        email=user.email,
        business_profile={"url": frontend},
        capabilities={"transfers": {"requested": True}},
    )
    user.stripe_account_id = account.id
    user.stripe_account_status = STATUS_PENDING
    user.stripe_onboarding_complete = False
    user.stripe_payouts_enabled = False
    db.commit()
    db.refresh(user)
    return account.id


def create_onboarding_link(db: Session, user: User) -> str:
    """Ensure Connect account exists and return Stripe Account Link URL."""
    stripe_account_id = ensure_connect_account(db, user)
    _configure_stripe()
    frontend = (os.environ.get("FRONTEND_URL") or "").strip().rstrip("/")
    if not frontend:
        raise RuntimeError("FRONTEND_URL is not configured")
    link = stripe.AccountLink.create(
        account=stripe_account_id,
        refresh_url=f"{frontend}/profile?connect=refresh",
        return_url=f"{frontend}/profile?connect=complete",
        type="account_onboarding",
        collection_options={"fields": "eventually_due"},
    )
    url = link.url
    if not url:
        raise RuntimeError("Stripe did not return an onboarding URL")
    return url


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
