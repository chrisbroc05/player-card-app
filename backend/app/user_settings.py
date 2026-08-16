"""User preference defaults and validation."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

DEFAULT_USER_SETTINGS: dict[str, Any] = {
    "autoplay_videos": True,
    "show_prices": True,
    "default_tier": "all_star",
    "default_theme": None,
    "email_offer_accepted": True,
    "email_new_offer": True,
    "email_animation_ready": True,
    "email_trade_request": True,
    "email_weekly_summary": False,
    "public_collection": True,
    "show_in_leaderboard": True,
}

VALID_TIERS = frozenset({"rookie", "all_star", "legends"})
BOOL_KEYS = frozenset(
    k
    for k, v in DEFAULT_USER_SETTINGS.items()
    if isinstance(v, bool)
)
OPTIONAL_THEME_KEYS = frozenset({"default_theme"})


def merge_user_settings(stored: dict[str, Any] | None) -> dict[str, Any]:
    """Return full settings object with defaults applied."""
    merged = deepcopy(DEFAULT_USER_SETTINGS)
    if not isinstance(stored, dict):
        return merged
    for key, value in stored.items():
        if key not in DEFAULT_USER_SETTINGS:
            continue
        if key in BOOL_KEYS:
            merged[key] = bool(value)
        elif key == "default_tier":
            tier = str(value or "").strip().lower()
            if tier in VALID_TIERS:
                merged[key] = tier
        elif key == "default_theme":
            if value is None or value == "":
                merged[key] = None
            else:
                merged[key] = str(value).strip()
        else:
            merged[key] = value
    return merged


def validate_settings_patch(patch: dict[str, Any]) -> dict[str, Any]:
    """Validate and normalize a partial settings update."""
    if not isinstance(patch, dict):
        raise ValueError("Settings must be an object")
    cleaned: dict[str, Any] = {}
    for key, value in patch.items():
        if key not in DEFAULT_USER_SETTINGS:
            raise ValueError(f"Unknown setting: {key}")
        if key in BOOL_KEYS:
            cleaned[key] = bool(value)
        elif key == "default_tier":
            tier = str(value or "").strip().lower()
            if tier not in VALID_TIERS:
                raise ValueError(f"Invalid default_tier: {value}")
            cleaned[key] = tier
        elif key == "default_theme":
            if value is None or value == "":
                cleaned[key] = None
            else:
                cleaned[key] = str(value).strip()
        else:
            cleaned[key] = value
    return cleaned


def user_has_public_collection(user: User | None) -> bool:
    if user is None:
        return False
    merged = merge_user_settings(user.settings if isinstance(user.settings, dict) else None)
    return bool(merged.get("public_collection", True))


def user_wants_email(user: User | None, setting_key: str) -> bool:
    if user is None:
        return True
    merged = merge_user_settings(user.settings if isinstance(user.settings, dict) else None)
    return bool(merged.get(setting_key, True))
