"""Card generation and preview pricing from environment variables."""

from __future__ import annotations

import os

OrderTier = str  # rookie | all_star | legends

_TIER_ENV_KEYS: dict[str, str] = {
    "rookie": "CARD_PRICE_ROOKIE",
    "all_star": "CARD_PRICE_ALLSTAR",
    "legends": "CARD_PRICE_LEGENDS",
}

_TIER_DEFAULTS: dict[str, float] = {
    "rookie": 2.00,
    "all_star": 4.00,
    "legends": 6.00,
}

_CARD_TIER_TO_ORDER: dict[str, str] = {
    "base": "rookie",
    "rare": "all_star",
    "legendary": "legends",
}


def normalize_order_tier(tier: str | None) -> str:
    raw = (tier or "rookie").strip().lower().replace("-", "_")
    if raw in ("allstar", "all_star"):
        return "all_star"
    if raw == "legends":
        return "legends"
    return "rookie"


def order_tier_from_card_tier(card_tier: str | None) -> str:
    key = (card_tier or "base").strip().lower()
    return _CARD_TIER_TO_ORDER.get(key, "rookie")


def _parse_price(raw: str | None, default: float) -> float:
    try:
        return max(0.0, float((raw or "").strip() or default))
    except ValueError:
        return default


def tier_generation_price(tier: str | None) -> float:
    """Per-preview / per-copy price for the given order tier."""
    key = normalize_order_tier(tier)
    env_name = _TIER_ENV_KEYS[key]
    default = _TIER_DEFAULTS[key]
    return _parse_price(os.environ.get(env_name), default)


def animated_upgrade_price() -> float:
    raw = os.environ.get("ANIMATED_CARD_PRICE") or os.environ.get("CARD_ANIMATED_UPGRADE_PRICE") or "10.00"
    return _parse_price(raw, 10.00)


def generation_price_payload(tier: str | None) -> dict:
    key = normalize_order_tier(tier)
    return {
        "tier": key,
        "first_preview_price": 0.0,
        "additional_preview_price": tier_generation_price(key),
        "animated_upgrade_price": animated_upgrade_price(),
    }
