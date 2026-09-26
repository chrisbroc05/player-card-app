"""Paid card-creation preview art styles (shared rarity, distinct AI prompts)."""

from __future__ import annotations

import random

PREVIEW_ART_STYLES: tuple[dict[str, str], ...] = (
    {
        "index": 0,
        "key": "cinematic",
        "label": "Cinematic",
        "suffix": (
            "dramatic cinematic lighting, moody atmosphere, deep shadows, "
            "vivid colors, professional sports photography style"
        ),
    },
    {
        "index": 1,
        "key": "vivid",
        "label": "Vivid",
        "suffix": (
            "bright vivid colors, clean crisp style, high energy, "
            "bold graphic art style, dynamic composition"
        ),
    },
)

PAID_PREVIEW_COUNT = len(PREVIEW_ART_STYLES)
CARD_CREATION_REPICK_PRICE = 1.00


def style_by_index(index: int) -> dict[str, str] | None:
    for style in PREVIEW_ART_STYLES:
        if int(style["index"]) == int(index):
            return style
    return None


def style_by_key(key: str) -> dict[str, str] | None:
    normalized = (key or "").strip().lower()
    for style in PREVIEW_ART_STYLES:
        if style["key"] == normalized:
            return style
    return None


def random_repick_style(used_keys: set[str]) -> dict[str, str]:
    pool = [s for s in PREVIEW_ART_STYLES if s["key"] not in used_keys]
    if not pool:
        pool = list(PREVIEW_ART_STYLES)
    return random.choice(pool)
