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
    """Per-preview regeneration price for the given order tier (not additional copies)."""
    key = normalize_order_tier(tier)
    env_name = _TIER_ENV_KEYS[key]
    default = _TIER_DEFAULTS[key]
    return _parse_price(os.environ.get(env_name), default)


def _copy_tier_defaults() -> list[dict]:
    return [
        {
            "min_copies": 1,
            "max_copies": 4,
            "price_per_copy": _parse_price(os.environ.get("COPY_PRICE_TIER_1_4"), 0.50),
        },
        {
            "min_copies": 5,
            "max_copies": 9,
            "price_per_copy": _parse_price(os.environ.get("COPY_PRICE_TIER_5_9"), 0.40),
        },
        {
            "min_copies": 10,
            "max_copies": None,
            "price_per_copy": _parse_price(os.environ.get("COPY_PRICE_TIER_10_PLUS"), 0.30),
        },
    ]


def copy_pricing_tiers() -> list[dict]:
    """Bulk copy pricing tiers (additional copies only)."""
    return _copy_tier_defaults()


def copy_unit_price_for_quantity(quantity: int) -> float:
    """Unit copy price based on target total quantity tier."""
    q = max(1, int(quantity))
    for tier in copy_pricing_tiers():
        lo = int(tier["min_copies"])
        hi = tier["max_copies"]
        if q >= lo and (hi is None or q <= int(hi)):
            return float(tier["price_per_copy"])
    return 0.50


def copy_charge_for_quantity(target_quantity: int, *, current_run: int = 1) -> dict:
    """
    Compute additional-copy charge when expanding print run to target_quantity.
    First card in the run is included; only extra copies are billed.
    """
    target = max(1, int(target_quantity))
    current = max(1, int(current_run))
    extra = max(0, target - current)
    unit = copy_unit_price_for_quantity(target)
    total = round(extra * unit, 2)
    return {
        "target_quantity": target,
        "current_run": current,
        "extra_copies": extra,
        "unit_price": unit,
        "total": total,
    }


def animated_upgrade_price() -> float:
    raw = os.environ.get("ANIMATED_CARD_PRICE") or os.environ.get("CARD_ANIMATED_UPGRADE_PRICE") or "10.00"
    return _parse_price(raw, 10.00)


def animated_additional_copy_unit_price(total_quantity: int) -> float:
    """Per-copy price for animated copies beyond the first (tier depends on total run)."""
    q = max(1, int(total_quantity))
    if q >= 5:
        return _parse_price(os.environ.get("ANIMATED_COPY_PRICE_5_PLUS"), 1.50)
    return _parse_price(os.environ.get("ANIMATED_COPY_PRICE_2_4"), 2.00)


def animated_studio_total_price(quantity: int) -> dict:
    """
    Studio animated card pricing: $10 base includes first copy;
    copies 2–4 at $2 each; 5+ total run uses $1.50 per additional copy.
    """
    q = max(1, min(10, int(quantity)))
    base = animated_upgrade_price()
    extra = max(0, q - 1)
    if extra == 0:
        return {
            "quantity": q,
            "base_price": base,
            "extra_copies": 0,
            "extra_unit_price": 0.0,
            "extra_total": 0.0,
            "total": round(base, 2),
        }
    unit = animated_additional_copy_unit_price(q)
    extra_total = round(extra * unit, 2)
    return {
        "quantity": q,
        "base_price": base,
        "extra_copies": extra,
        "extra_unit_price": unit,
        "extra_total": extra_total,
        "total": round(base + extra_total, 2),
    }


def generation_price_payload(tier: str | None) -> dict:
    key = normalize_order_tier(tier)
    return {
        "tier": key,
        "first_preview_price": 0.0,
        "additional_preview_price": tier_generation_price(key),
        "animated_upgrade_price": animated_upgrade_price(),
        "animated_copy_pricing": {
            "additional_2_to_4": animated_additional_copy_unit_price(4),
            "additional_5_plus": animated_additional_copy_unit_price(5),
        },
        "copy_pricing_tiers": copy_pricing_tiers(),
    }
