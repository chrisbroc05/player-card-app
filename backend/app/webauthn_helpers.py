"""WebAuthn RP configuration and challenge cache."""

from __future__ import annotations

import os
import time
from datetime import timezone
from urllib.parse import urlparse

from models import User

CHALLENGE_TTL_SECONDS = 300
_login_challenge_cache: dict[str, float] = {}


def webauthn_origins() -> list[str]:
    raw = (os.environ.get("WEBAUTHN_ORIGINS") or "").strip()
    if raw:
        return [part.strip() for part in raw.split(",") if part.strip()]
    return [
        "https://prospectlegends.com",
        "https://www.prospectlegends.com",
        "https://player-card-app.onrender.com",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


def webauthn_rp_id_for_origin(origin: str) -> str:
    host = (urlparse(origin).hostname or "").lower()
    if host in ("localhost", "127.0.0.1"):
        return "localhost"
    if host == "prospectlegends.com" or host.endswith(".prospectlegends.com"):
        return "prospectlegends.com"
    return host or "prospectlegends.com"


def resolve_webauthn_origin(origin_header: str | None) -> tuple[str, str]:
    origin = (origin_header or "").strip()
    allowed = webauthn_origins()
    if origin in allowed:
        return origin, webauthn_rp_id_for_origin(origin)
    # Default production values when Origin header is missing (non-browser clients).
    default_origin = allowed[0]
    return default_origin, webauthn_rp_id_for_origin(default_origin)


def store_login_challenge(challenge_b64: str) -> None:
    _purge_expired_login_challenges()
    _login_challenge_cache[challenge_b64] = time.time() + CHALLENGE_TTL_SECONDS


def consume_login_challenge(challenge_b64: str) -> bool:
    _purge_expired_login_challenges()
    expires_at = _login_challenge_cache.pop(challenge_b64, None)
    return expires_at is not None and expires_at >= time.time()


def _purge_expired_login_challenges() -> None:
    now = time.time()
    expired = [key for key, expires_at in _login_challenge_cache.items() if expires_at < now]
    for key in expired:
        _login_challenge_cache.pop(key, None)


def auth_user_payload(user: User) -> dict:
    created = user.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "created_at": created.isoformat(),
        "credit_balance": float(user.credit_balance or 0),
    }
