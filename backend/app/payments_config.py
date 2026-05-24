"""Payment feature flag (Stripe and credit operations gated until enabled)."""

from __future__ import annotations

import os

from fastapi import HTTPException


def payments_enabled() -> bool:
    raw = (os.environ.get("PAYMENTS_ENABLED") or "false").strip().lower()
    return raw in ("true", "1", "yes", "on")


def require_payments_enabled() -> None:
    if not payments_enabled():
        raise HTTPException(status_code=503, detail="Payments not yet enabled")
