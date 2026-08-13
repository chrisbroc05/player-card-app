"""
Prospect Legends theme library: categories, theme metadata, and AI prompt modifiers.
"""

from __future__ import annotations

from typing import Any

# ---------------------------------------------------------------------------
# Theme definitions (source of truth for GET /themes and generation prompts)
# ---------------------------------------------------------------------------

THEME_CATEGORIES: list[dict[str, Any]] = [
    {
        "id": "visual",
        "name": "Visual / Aesthetic",
        "themes": [
            {
                "id": "neon",
                "name": "Neon",
                "category": "visual",
                "ai_prompt_modifier": (
                    "neon lights aesthetic, vibrant electric colors, glowing neon outlines, "
                    "cyberpunk sports card style, bright neon green and hot pink color scheme"
                ),
            },
            {
                "id": "retro_vintage",
                "name": "Retro / Vintage",
                "category": "visual",
                "ai_prompt_modifier": (
                    "vintage retro baseball card style, aged paper texture, classic 1950s sports card aesthetic, "
                    "warm sepia and cream color tones, nostalgic feel"
                ),
            },
            {
                "id": "chrome",
                "name": "Chrome",
                "category": "visual",
                "ai_prompt_modifier": (
                    "chrome metallic finish, silver and steel color palette, highly reflective surfaces, "
                    "modern premium sports card, sleek chrome aesthetic"
                ),
            },
            {
                "id": "holographic",
                "name": "Holographic",
                "category": "visual",
                "ai_prompt_modifier": (
                    "holographic iridescent card style, rainbow prismatic color shifts, shimmering holographic "
                    "foil effect, premium collectible card aesthetic"
                ),
            },
            {
                "id": "midnight",
                "name": "Midnight",
                "category": "visual",
                "ai_prompt_modifier": (
                    "midnight dark theme, deep navy and purple color palette, subtle star field background, "
                    "premium dark sports card aesthetic, moody lighting"
                ),
            },
            {
                "id": "inferno",
                "name": "Inferno",
                "category": "visual",
                "ai_prompt_modifier": (
                    "inferno fire theme, deep red and orange flame colors, dramatic fire and ember effects, "
                    "intense heat aesthetic, dramatic sports card style"
                ),
            },
        ],
    },
    {
        "id": "seasonal",
        "name": "Seasonal / Holiday",
        "themes": [
            {
                "id": "spring_training",
                "name": "Spring Training",
                "category": "seasonal",
                "ai_prompt_modifier": (
                    "spring training theme, fresh grass green and bright white colors, clean crisp spring "
                    "aesthetic, new season energy, bright natural lighting"
                ),
            },
            {
                "id": "summer_slam",
                "name": "Summer Slam",
                "category": "seasonal",
                "ai_prompt_modifier": (
                    "summer theme, bright sunshine yellow and orange colors, high energy summer sports aesthetic, "
                    "warm vibrant color palette, dynamic action feel"
                ),
            },
            {
                "id": "halloween",
                "name": "Halloween",
                "category": "seasonal",
                "ai_prompt_modifier": (
                    "Halloween theme, orange and black color scheme, spooky dramatic atmosphere, "
                    "dark moody background with orange accents, eerie sports card style"
                ),
            },
            {
                "id": "christmas",
                "name": "Christmas",
                "category": "seasonal",
                "ai_prompt_modifier": (
                    "Christmas holiday theme, red and green color scheme, gold star accents, festive holiday "
                    "sports card aesthetic, warm celebratory feel"
                ),
            },
            {
                "id": "fourth_of_july",
                "name": "Fourth of July",
                "category": "seasonal",
                "ai_prompt_modifier": (
                    "Fourth of July patriotic theme, red white and blue color scheme, stars and stripes aesthetic, "
                    "bold patriotic sports card style, americana feel"
                ),
            },
            {
                "id": "new_year",
                "name": "New Year",
                "category": "seasonal",
                "ai_prompt_modifier": (
                    "New Year celebration theme, black and gold color scheme, confetti and celebration effects, "
                    "champagne and fireworks aesthetic, premium festive feel"
                ),
            },
        ],
    },
    {
        "id": "special",
        "name": "Special Editions",
        "themes": [
            {
                "id": "gold_edition",
                "name": "Gold Edition",
                "category": "special",
                "ai_prompt_modifier": (
                    "gold edition premium theme, rich gold and amber color palette, luxury collectible feel, "
                    "prestigious sports card aesthetic, ornate gold details"
                ),
            },
            {
                "id": "diamond",
                "name": "Diamond",
                "category": "special",
                "ai_prompt_modifier": (
                    "diamond edition theme, crystal clear ice blue and white color palette, diamond and gem "
                    "aesthetic, ultra premium collectible card style, brilliant sparkle effects"
                ),
            },
            {
                "id": "mvp",
                "name": "MVP",
                "category": "special",
                "ai_prompt_modifier": (
                    "MVP award theme, royal purple and gold color scheme, championship trophy aesthetic, "
                    "most valuable player energy, elite sports card style"
                ),
            },
            {
                "id": "hall_of_fame",
                "name": "Hall of Fame",
                "category": "special",
                "ai_prompt_modifier": (
                    "Hall of Fame theme, deep bronze and gold color palette, legendary prestige aesthetic, "
                    "historic sports card style, timeless classic feel"
                ),
            },
            {
                "id": "rookie_of_the_year",
                "name": "Rookie of the Year",
                "category": "special",
                "ai_prompt_modifier": (
                    "Rookie of the Year theme, bright silver and electric blue colors, fresh new talent aesthetic, "
                    "rising star sports card style, breakthrough energy"
                ),
            },
            {
                "id": "captain",
                "name": "Captain",
                "category": "special",
                "ai_prompt_modifier": (
                    "Captain theme, deep navy and gold color scheme, leadership and authority aesthetic, "
                    "team captain sports card style, strong commanding feel"
                ),
            },
        ],
    },
]


def _build_prompt_index() -> dict[str, str]:
    out: dict[str, str] = {}
    for cat in THEME_CATEGORIES:
        for t in cat["themes"]:
            out[str(t["id"])] = str(t["ai_prompt_modifier"])
    return out


THEME_PROMPTS_BY_ID: dict[str, str] = _build_prompt_index()

# Slugs accepted on orders/API for backwards compatibility (map to a modifier string).
LEGACY_THEME_PROMPTS: dict[str, str] = {
    "opening_day": THEME_PROMPTS_BY_ID["spring_training"],
    "fire": THEME_PROMPTS_BY_ID["inferno"],
}

KNOWN_THEME_SLUGS: frozenset[str] = frozenset(THEME_PROMPTS_BY_ID) | frozenset(LEGACY_THEME_PROMPTS)


def is_valid_theme_slug(slug: str) -> bool:
    return slug.strip().lower() in KNOWN_THEME_SLUGS


def theme_prompt_for_slug(special_theme: str | None) -> str:
    """Return the AI prompt modifier for a theme id, or empty string if none / unknown."""
    if special_theme is None:
        return ""
    key = str(special_theme).strip().lower()
    if not key:
        return ""
    if key in THEME_PROMPTS_BY_ID:
        return THEME_PROMPTS_BY_ID[key]
    if key in LEGACY_THEME_PROMPTS:
        return LEGACY_THEME_PROMPTS[key]
    return ""
