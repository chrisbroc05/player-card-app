"""Google OAuth helpers and pending signup storage."""

from __future__ import annotations

import logging
import os
import re
import time
import urllib.parse
from decimal import Decimal
from typing import Any

from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from sqlalchemy.orm import Session

from beta_config import get_beta_invite_code
from email_service import frontend_url, send_welcome_email
from models import User

logger = logging.getLogger(__name__)

DEFAULT_GOOGLE_REDIRECT_URI = "https://prospectlegends.com/auth/google/callback"

GOOGLE_SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]

_oauth_states: dict[str, float] = {}
_pending_google_signups: dict[str, dict[str, Any]] = {}
_PENDING_TTL_SECONDS = 900


def _google_client_config() -> dict[str, Any]:
    client_id = (os.environ.get("GOOGLE_CLIENT_ID") or "").strip()
    client_secret = (os.environ.get("GOOGLE_CLIENT_SECRET") or "").strip()
    redirect_uri = google_redirect_uri()
    if not client_id or not client_secret:
        raise RuntimeError("Google OAuth is not configured")
    return {
        "web": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [redirect_uri],
        }
    }


def google_redirect_uri() -> str:
    return (os.environ.get("GOOGLE_REDIRECT_URI") or DEFAULT_GOOGLE_REDIRECT_URI).strip()


def google_oauth_configured() -> bool:
    return all(
        (os.environ.get(key) or "").strip()
        for key in ("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET")
    )


def build_google_flow() -> Flow:
    flow = Flow.from_client_config(_google_client_config(), scopes=GOOGLE_SCOPES)
    flow.redirect_uri = google_redirect_uri()
    return flow


def store_oauth_state(state: str) -> None:
    _purge_expired(_oauth_states)
    _oauth_states[state] = time.time() + _PENDING_TTL_SECONDS


def consume_oauth_state(state: str | None) -> bool:
    _purge_expired(_oauth_states)
    if not state:
        return False
    expires = _oauth_states.pop(state, None)
    return expires is not None and expires >= time.time()


def store_pending_google_signup(token: str, payload: dict[str, Any]) -> None:
    _purge_pending_signups()
    _pending_google_signups[token] = {**payload, "expires": time.time() + _PENDING_TTL_SECONDS}


def get_pending_google_signup(token: str) -> dict[str, Any] | None:
    _purge_pending_signups()
    data = _pending_google_signups.get(token)
    if not data:
        return None
    if data.get("expires", 0) < time.time():
        _pending_google_signups.pop(token, None)
        return None
    return data


def pop_pending_google_signup(token: str) -> dict[str, Any] | None:
    data = get_pending_google_signup(token)
    if data:
        _pending_google_signups.pop(token, None)
    return data


def _purge_pending_signups() -> None:
    now = time.time()
    expired = [key for key, data in _pending_google_signups.items() if data.get("expires", 0) < now]
    for key in expired:
        _pending_google_signups.pop(key, None)


def _purge_expired(cache: dict[str, float]) -> None:
    now = time.time()
    expired = [key for key, expires in cache.items() if expires < now]
    for key in expired:
        cache.pop(key, None)


def validate_beta_invite_code(invite_code: str | None) -> bool:
    required = get_beta_invite_code()
    if required is None:
        return True
    provided = (invite_code or "").strip()
    return bool(provided) and provided.casefold() == required.casefold()


def unique_google_display_name(db: Session, google_name: str | None, email: str, google_id: str) -> str:
    raw = (google_name or email.split("@")[0] or "player").strip()
    base = re.sub(r"[^a-zA-Z0-9]", "", raw).lower() or email.split("@")[0].lower()
    base = base[:190]
    candidate = base
    if db.query(User).filter(User.display_name == candidate).first():
        candidate = f"{base}{google_id[:4]}"[:200]
    if db.query(User).filter(User.display_name == candidate).first():
        candidate = f"{base}{google_id[:8]}"[:200]
    return candidate[:200]


def create_google_user(
    db: Session,
    *,
    email: str,
    google_name: str | None,
    google_id: str,
) -> User:
    display_name = unique_google_display_name(db, google_name, email, google_id)
    user = User(
        email=email.strip().lower(),
        display_name=display_name,
        google_id=google_id,
        hashed_password=None,
        credit_balance=Decimal("0.00"),
        settings={},
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info("New Google user created: %s", user.email)
    send_welcome_email(user.email, user.display_name)
    return user


def google_success_redirect(*, token: str, user: User, is_new: bool) -> RedirectResponse:
    params = urllib.parse.urlencode(
        {
            "token": token,
            "user_id": str(user.id),
            "display_name": user.display_name,
            "is_new": "true" if is_new else "false",
        }
    )
    return RedirectResponse(f"{frontend_url()}/auth/google/success?{params}")


def google_error_redirect() -> RedirectResponse:
    return RedirectResponse(f"{frontend_url()}/login?error=google_failed")


def google_invite_redirect(*, pending_token: str, email: str, name: str) -> RedirectResponse:
    params = urllib.parse.urlencode(
        {
            "pending": pending_token,
            "email": email,
            "name": name or "",
        }
    )
    return RedirectResponse(f"{frontend_url()}/google-invite?{params}")
