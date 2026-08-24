"""Weighted rarity pull for card generation."""

from __future__ import annotations

import logging
import random
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

# TEMP: forced 1-of-1 for reveal QA — reset after testing
PULL_RATES = [
    ("black_label", 0.0),
    ("one_of_one", 0.99),
    ("gold_auto", 0.0),
    ("refractor", 0.0),
    ("foil", 0.0),
    ("standard", 0.01),
]

RARITY_DISPLAY_NAMES = {
    "standard": "Base",
    "foil": "Foil",
    "refractor": "Refractor",
    "gold_auto": "Gold Auto",
    "one_of_one": "1 of 1",
    "black_label": "Black Label",
}

RARITY_COLORS = {
    "standard": "#FFFFFF",
    "foil": "#E8C56A",
    "refractor": "#85B7EB",
    "gold_auto": "#FFD700",
    "one_of_one": "#FF4444",
    "black_label": "#000000",
}

RARE_PULL_TIERS = frozenset({"gold_auto", "one_of_one", "black_label"})

RARITY_BREAKDOWN_KEYS = tuple(name for name, _ in reversed(PULL_RATES))

RARITY_SORT_WEIGHT = {
    "standard": 0,
    "foil": 1,
    "refractor": 2,
    "gold_auto": 3,
    "one_of_one": 4,
    "black_label": 5,
    "base": 0,
    "common": 0,
    "rare": 2,
    "legendary": 3,
}

TEMPLATE_PROMPTS = {
    "rookie": {
        1: (
            "Classic rookie style — clean crisp green borders, fresh energetic design, "
            "bright stadium lighting, traditional sports card composition"
        ),
        2: (
            "Vintage rookie style — aged warm tones, retro 1980s baseball card aesthetic, "
            "slight grain texture, nostalgic feel, classic typography era"
        ),
        3: (
            "Neon rookie style — electric neon green glowing borders, dark background, "
            "vibrant dramatic lighting, modern streetwear energy"
        ),
        4: (
            "Chrome rookie style — metallic silver surfaces, reflective chrome finish, "
            "cool steel tones with green accents, premium metallic sheen"
        ),
        5: (
            "Prizm rookie style — rainbow prismatic light effects on borders, colorful "
            "light refraction, dynamic multi-color shimmer, collector premium feel"
        ),
    },
    "all_star": {
        1: (
            "Elite all-star style — deep navy blue, sharp modern design, bold confident "
            "composition, professional premium feel"
        ),
        2: (
            "Starlight all-star style — deep space background with star field, blue cosmic "
            "energy, celestial premium atmosphere"
        ),
        3: (
            "Ice all-star style — cool crystal ice effect, frozen blue tones, crystalline "
            "border effects, cold premium aesthetic"
        ),
        4: (
            "Blueprint all-star style — technical blueprint grid lines, architectural "
            "precision, cool blue technical drawing aesthetic, engineered feel"
        ),
        5: (
            "Optic all-star style — bright white background with electric blue accents, "
            "high contrast clean modern design, optical brightness and clarity"
        ),
    },
    "legends": {
        1: (
            "Prestige legends style — rich gold tones, classic timeless design, royal "
            "premium composition, hall of fame worthy aesthetic"
        ),
        2: (
            "Black Gold legends style — pure black background with gold accents, ultra "
            "premium dark luxury feel, maximum contrast and prestige"
        ),
        3: (
            "Holo legends style — full holographic gold treatment, rainbow light effects "
            "on gold surfaces, iridescent premium shimmer throughout"
        ),
        4: (
            "Dynasty legends style — deep burgundy and gold, regal dynasty colors, "
            "imperial premium aesthetic, championship era feel"
        ),
        5: (
            "Crown legends style — regal purple and gold, crown jewel premium design, "
            "royal collector aesthetic, ultimate prestige feel"
        ),
    },
}

TEMPLATE_NAMES = {
    "rookie": {1: "Classic", 2: "Vintage", 3: "Neon", 4: "Chrome", 5: "Prizm"},
    "all_star": {1: "Elite", 2: "Starlight", 3: "Ice", 4: "Blueprint", 5: "Optic"},
    "legends": {1: "Prestige", 2: "Black Gold", 3: "Holo", 4: "Dynasty", 5: "Crown"},
}

_LEGACY_RARITY_LABELS = {
    "base": "Base",
    "common": "Common",
    "rare": "Rare",
    "legendary": "Legendary",
}


def rarity_sort_weight(rarity: str | None) -> int:
    key = (rarity or "standard").lower().replace("-", "_").replace(" ", "_")
    return RARITY_SORT_WEIGHT.get(key, 0)


def normalize_tier_key(tier: str) -> str:
    tier_key = (tier or "rookie").lower().replace("-", "_").replace(" ", "_")
    if tier_key in ("allstar", "all_star", "rare"):
        return "all_star"
    if tier_key in ("legends", "legendary"):
        return "legends"
    return "rookie"


def get_template_prompt(tier: str, template: int) -> str:
    tier_key = normalize_tier_key(tier)
    tier_templates = TEMPLATE_PROMPTS.get(tier_key, TEMPLATE_PROMPTS["rookie"])
    return tier_templates.get(int(template or 1), tier_templates[1])


def get_template_name(tier: str, template: int) -> str:
    tier_key = normalize_tier_key(tier)
    tier_names = TEMPLATE_NAMES.get(tier_key, TEMPLATE_NAMES["rookie"])
    return tier_names.get(int(template or 1), tier_names[1])


def pull_rarity() -> str:
    """Randomly pull a rarity tier based on weighted probabilities."""
    roll = random.random()
    cumulative = 0.0
    for rarity, rate in PULL_RATES:
        cumulative += rate
        if roll < cumulative:
            return rarity
    return "standard"


def pull_template() -> int:
    """Randomly assign one of 5 template variants for the card's tier."""
    return random.randint(1, 5)


def is_one_of_one(db: Session, card_id: str, player_name: str, tier: str) -> bool:
    """
    Verify a 1 of 1 pull is truly unique.
    Returns True when no conflicting 1 of 1 exists for this player + tier.
    """
    from models import Card

    _ = card_id
    existing = (
        db.query(Card)
        .filter(
            Card.player_name == player_name,
            Card.tier == tier,
            Card.rarity == "one_of_one",
            Card.status.notin_(("deleted", "discarded", "preview")),
        )
        .first()
    )
    return existing is None


def rarity_display_name(rarity: str | None) -> str:
    key = (rarity or "standard").lower()
    if key in RARITY_DISPLAY_NAMES:
        return RARITY_DISPLAY_NAMES[key]
    return _LEGACY_RARITY_LABELS.get(key, key.replace("_", " ").title())


def resolve_rarity_pull(
    db: Session,
    *,
    card_id: str,
    player_name: str,
    tier: str,
    logger: logging.Logger | None = None,
) -> tuple[str, int]:
    """Pull rarity + template, enforce 1-of-1 uniqueness, and log rare hits."""
    pulled_rarity = pull_rarity()
    if pulled_rarity == "one_of_one" and not is_one_of_one(db, card_id, player_name, tier):
        pulled_rarity = "gold_auto"
        if logger is not None:
            logger.info(
                "1 of 1 downgraded to gold_auto for %s %s — already exists",
                player_name,
                tier,
            )

    pulled_template = pull_template()
    if logger is not None:
        logger.info(
            "Card %s pulled: rarity=%s template=%s player=%s",
            card_id,
            pulled_rarity,
            pulled_template,
            player_name,
        )
        if pulled_rarity in RARE_PULL_TIERS:
            logger.info(
                "🎉 RARE PULL: %s for %s (%s) card %s",
                pulled_rarity,
                player_name,
                tier,
                card_id,
            )
    return pulled_rarity, pulled_template


def empty_rarity_breakdown() -> dict[str, int]:
    return {key: 0 for key in RARITY_BREAKDOWN_KEYS}


def expected_pull_rates() -> dict[str, float]:
    return {name: rate for name, rate in PULL_RATES}
