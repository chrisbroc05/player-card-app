"""URL slug helpers for public profile routes (/profile/:username)."""

from __future__ import annotations

import re

from sqlalchemy.orm import Session

from models import User

_SLUG_RE = re.compile(r"[^a-z0-9]+")


def profile_slug(display_name: str | None) -> str:
    """Stable URL slug from a user's display name."""
    raw = (display_name or "").strip().lower()
    slug = _SLUG_RE.sub("-", raw).strip("-")
    return slug or "user"


def find_user_by_profile_slug(db: Session, username: str) -> User | None:
    """Resolve a profile slug to a user (case-insensitive slug match)."""
    target = profile_slug(username)
    if not target:
        return None
    for user in db.query(User).all():
        if profile_slug(user.display_name) == target:
            return user
    return None
