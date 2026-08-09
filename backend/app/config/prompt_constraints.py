"""Handedness injection and universal Kling prompt constraints."""

from __future__ import annotations

# Categories that use throwing_hand for prompt injection.
THROWING_HAND_CATEGORIES = frozenset(
    {
        "pitching",
        "throwing",
        "fielding_ground",
        "fielding",  # legacy
        "fly_ball",
        "outfield",
        "catching",
        "celebrating",
        "general",
    }
)

# Categories that use batting_side for prompt injection.
BATTING_SIDE_CATEGORIES = frozenset({"hitting"})

UNIVERSAL_KLING_CONSTRAINTS = (
    "Only one baseball may appear in any scene at any time — never show multiple baseballs "
    "or duplicate any sports equipment. "
    "No text, numbers, names, or lettering anywhere on clothing or uniforms. "
    "Blank jerseys only. No player name on back of jersey. "
    "No jersey number on front or back. "
    "The background must remain static and faithful to the original image. "
    "Do not add, generate, or animate any other people, players, coaches, umpires, "
    "or figures of any kind that are not clearly visible in the original photo. "
    "If the original background has no people in it, the animated background must also have no people. "
    "Animate only the identified athlete. "
    "Locked off static camera. Absolutely no zoom, push, pull, pan, or camera movement of any kind. "
    "Photorealistic."
)


def throwing_hand_prompt(throwing_hand: str | None) -> str:
    hand = (throwing_hand or "").strip().lower()
    if hand == "left":
        return (
            "The athlete throws with their LEFT hand. "
            "Their throwing arm is on the LEFT side of their body."
        )
    return (
        "The athlete throws with their RIGHT hand. "
        "Their throwing arm is on the RIGHT side of their body."
    )


def batting_side_prompt(batting_side: str | None) -> str:
    side = (batting_side or "").strip().lower()
    if side == "left":
        return (
            "The athlete bats LEFT-HANDED, standing on the RIGHT side of home plate, "
            "facing the pitcher."
        )
    if side == "switch":
        return (
            "The athlete is a SWITCH HITTER. In this photo they are batting from the "
            "side shown — animate the swing from exactly the stance visible in the image."
        )
    return (
        "The athlete bats RIGHT-HANDED, standing on the LEFT side of home plate, "
        "facing the pitcher."
    )


def handedness_for_category(
    action_category: str | None,
    *,
    throwing_hand: str | None = None,
    batting_side: str | None = None,
) -> str:
    cat = (action_category or "").strip().lower()
    if cat in BATTING_SIDE_CATEGORIES:
        return batting_side_prompt(batting_side)
    if cat in THROWING_HAND_CATEGORIES or not cat:
        return throwing_hand_prompt(throwing_hand)
    return throwing_hand_prompt(throwing_hand)
