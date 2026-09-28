"""
Mutable beta invite code for admin overrides.

The effective code is read from an in-memory override when set via POST /admin/invite-codes;
otherwise the BETA_INVITE_CODE environment variable is used.

NOTE: On Render (or any redeploy), the process restarts and only the env value applies again
until an admin updates the code via the dashboard. Persisting invite codes in the database
would avoid this reset — left as a future improvement.
"""

from __future__ import annotations

import os

# None = not overridden; use os.environ. Non-None = last value set by admin API (may be "").
_runtime_invite_code: str | None = None


def get_beta_invite_code() -> str | None:
    """Return the invite code string if beta mode should be active, else None."""
    if _runtime_invite_code is not None:
        v = _runtime_invite_code.strip()
        return v or None
    return (os.environ.get("BETA_INVITE_CODE") or "").strip() or None


def set_beta_invite_code(new_code: str) -> str:
    """Set in-memory invite code (replaces env until process restart). Returns stripped code."""
    global _runtime_invite_code
    _runtime_invite_code = new_code.strip()
    return _runtime_invite_code


def beta_mode_active() -> bool:
    return get_beta_invite_code() is not None


def beta_signup_free_card_token_count() -> int:
    """Free card creation tokens granted when a user redeems the beta invite code."""
    try:
        return max(0, int(os.environ.get("BETA_FREE_CARD_TOKENS", "5")))
    except ValueError:
        return 5


def invite_code_grants_free_tokens(invite_code: str | None) -> bool:
    """True when the provided invite code matches the active beta invite code."""
    required = get_beta_invite_code()
    if not required:
        return False
    provided = (invite_code or "").strip()
    return bool(provided) and provided.casefold() == required.casefold()
