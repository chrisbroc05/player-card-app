"""Optional parent/guardian email helpers."""

from __future__ import annotations

import re

from models import User

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def normalize_optional_parent_email(raw: str | None) -> str | None:
    """Return normalized parent email or None. Raises ValueError if format invalid."""
    if raw is None:
        return None
    s = raw.strip().lower()
    if not s:
        return None
    if len(s) > 320 or not _EMAIL_RE.match(s):
        raise ValueError("Invalid parent email address")
    return s


def parent_email_for_notify(user: User | None) -> str | None:
    """Parent copy address for notifications, or None if unset/same as user email."""
    if user is None:
        return None
    parent = normalize_optional_parent_email(getattr(user, "parent_email", None))
    if parent is None:
        return None
    primary = (user.email or "").strip().lower()
    if parent == primary:
        return None
    return parent
