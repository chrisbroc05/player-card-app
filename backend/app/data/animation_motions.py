"""Pre-defined motion prompts for AI video generation (Kling / Pika / Runway)."""

from __future__ import annotations

# Motion-specific action text — "next 5 seconds" format tuned for Kling 3.0.
MOTION_ACTION_BODIES: dict[str, str] = {
    "pitch_windup": (
        "Over the next 5 seconds the pitcher completes their delivery — driving off the rubber "
        "with explosive leg drive, arm coming through in a fluid overhand motion, releasing a "
        "single baseball at the top of the delivery, following through naturally across the body "
        "as the back leg swings around for balance. Only one baseball is shown leaving the hand."
    ),
    "throwing": (
        "Over the next 5 seconds the player completes their throw — planting the front foot "
        "firmly, rotating hips and shoulders through the throw, arm extending fully toward the "
        "target at release of a single baseball, then following through naturally down and across "
        "the body as weight transfers to the front foot. Only one baseball leaves the hand."
    ),
    "hit_homerun": (
        "Over the next 5 seconds the batter explodes through the hitting zone — hips rotating "
        "fully, hands driving through the contact zone making contact with a single baseball, "
        "arms extending completely, bat finishing high over the back shoulder in a full powerful "
        "follow through as the single baseball travels away. Only one baseball appears in the scene."
    ),
    "field_dive": (
        "Over the next 5 seconds the fielder completes the dive — launching fully horizontal "
        "through the air with glove extended to catch a single incoming baseball, landing on the "
        "grass and sliding to a stop, coming up to show the caught ball in the glove. Only one "
        "baseball appears in the scene."
    ),
    "celebrate_homerun_trot": (
        "Over the next 5 seconds the player continues their home run trot — measured confident "
        "steps, head up, slight smile, rounding toward the next base with total composure and "
        "confidence. No baseball shown in this scene."
    ),
    "celebrate_fist": (
        "Over the next 5 seconds the player completes their celebration — fist pumping powerfully "
        "one to two times, intense focused expression, pure competitive emotion, upper body motion "
        "only. No baseball shown in this scene."
    ),
    "catch_framing_throw": (
        "Over the next 5 seconds the catcher completes the play — framing a single incoming "
        "baseball with soft hands, smoothly rising from the crouch, arm loading and firing a single "
        "baseball with a strong throw with full extension and natural follow through. Only one "
        "baseball appears in the scene at any time."
    ),
    "celebrate_energy": (
        "Over the next 5 seconds the player erupts in celebration — both arms throwing upward, "
        "possible slight jump, pure joy and excitement, the natural release of a big moment. "
        "No baseball shown in this scene."
    ),
}

_KLING_CONSTRAINTS_SUFFIX = (
    "Animate only the identified athlete. "
    "Only one baseball may appear in the scene at any time. "
    "Never show multiple baseballs or duplicate any sports equipment. "
    "No text, numbers, names, or lettering anywhere on clothing or uniforms. "
    "Blank jerseys only. No player name on back of jersey. "
    "No jersey number on front or back. "
    "Do not add or generate other players, coaches, or people not in the original image. "
    "Locked off static camera. Absolutely no zoom, push, pull, pan, or camera movement of any kind. "
    "Photorealistic."
)

# Legacy prompts retained for cards created before the motion library trim.
_LEGACY_MOTION_PROMPTS: dict[str, str] = {
    "pitch_delivery": (
        "The youth baseball athlete performs a stretch-position pitch delivery: compact leg lift, "
        "explosive hip rotation, high arm slot, full extension at release, chest over knee on "
        "follow-through."
    ),
    "pitch_strikeout_roar": (
        "The youth baseball athlete performs a pitcher's strikeout celebration: punches down hard "
        "with throwing arm, lets out a roar, turns toward the dugout with pure intensity and fire."
    ),
    "hit_stance": (
        "The youth baseball athlete performs a clean contact swing: balanced stance, controlled "
        "stride, short direct path to contact, solid extension through the ball, balanced finish."
    ),
    "hit_walkup": (
        "The youth baseball athlete approaches the plate with confidence: knocks dirt from cleats, "
        "taps plate with bat, takes a slow practice swing, locks eyes forward, settles into stance."
    ),
    "hit_bat_flip": (
        "The youth baseball athlete performs a clean home run bat flip: makes contact, watches the "
        "ball for a beat, then releases the bat with one hand in a slow controlled flip, begins trot."
    ),
    "field_dive_celebrate": (
        "The youth baseball athlete pops up from a diving catch: springs to their feet immediately "
        "after the slide, ball raised in glove, pumps fist toward the infield, huge energy."
    ),
    "field_sprint": (
        "The youth baseball athlete sprints into fielding position: athletic first step, low "
        "aggressive angle, glove down to field a ground ball cleanly, plants and squares up to throw."
    ),
    "celebrate_crowd": (
        "The youth baseball athlete points toward the stands after a home run with confident "
        "celebratory energy."
    ),
    "celebrate_run": (
        "The youth baseball athlete runs full speed: powerful arm drive, high knees, forward lean, "
        "explosive stride, eyes ahead."
    ),
}


def build_runway_prompt(
    motion_id: str,
    scenario_id: str | None = None,
    photo_notes: str | None = None,
    tier: str | None = None,
    action_category: str | None = None,
    throwing_hand: str | None = None,
    batting_side: str | None = None,
) -> str | None:
    """Build the full Kling prompt: scenario, handedness, notes, universal constraints."""
    from config.motion_scenarios import (
        GENERIC_SCENARIO_CONTEXT,
        get_scenario,
        get_scenario_by_category,
        kling_motion_for_category,
    )
    from config.prompt_constraints import UNIVERSAL_KLING_CONSTRAINTS, handedness_for_category

    key = (motion_id or "").strip()
    category = (action_category or "").strip().lower() or None

    scenario = None
    if category:
        scenario = get_scenario_by_category(category, scenario_id)
    if scenario is None:
        scenario = get_scenario(key, scenario_id)

    if scenario and scenario.get("prompt"):
        scenario_text = scenario["prompt"]
    else:
        action_body = MOTION_ACTION_BODIES.get(key) or _LEGACY_MOTION_PROMPTS.get(key)
        if not action_body:
            return None
        scenario_text = f"Cinematic slow motion sports video. {action_body}"

    handedness = handedness_for_category(
        category,
        throwing_hand=throwing_hand,
        batting_side=batting_side,
    )

    notes = (photo_notes or "").strip()
    user_context = f"Additional context: {notes[:150]}." if notes else ""

    parts = [scenario_text, handedness]
    if user_context:
        parts.append(user_context)
    parts.append(UNIVERSAL_KLING_CONSTRAINTS)
    return " ".join(parts)


def kling_motion_for_action_category(action_category: str | None) -> str | None:
    from config.motion_scenarios import kling_motion_for_category

    return kling_motion_for_category((action_category or "").strip())


def get_motion_prompt(
    motion_id: str,
    photo_notes: str | None = None,
    scenario_id: str | None = None,
    action_category: str | None = None,
    throwing_hand: str | None = None,
    batting_side: str | None = None,
) -> str | None:
    """Return the Kling prompt for a motion id, or None if unknown."""
    built = build_runway_prompt(
        motion_id,
        scenario_id,
        photo_notes,
        action_category=action_category,
        throwing_hand=throwing_hand,
        batting_side=batting_side,
    )
    if built:
        return built
    motion = get_motion_by_id(motion_id)
    if motion is None:
        return None
    prompt = (motion.get("prompt") or "").strip()
    return prompt or None


SELECTABLE_MOTION_PROMPTS: dict[str, str] = {
    motion_id: build_runway_prompt(motion_id) or ""
    for motion_id in MOTION_ACTION_BODIES
}

ANIMATION_MOTIONS: list[dict[str, str]] = [
    {
        "id": "pitch_windup",
        "label": "Winding Up and Throwing",
        "category": "Pitching",
        "prompt": SELECTABLE_MOTION_PROMPTS["pitch_windup"],
    },
    {
        "id": "throwing",
        "label": "Throwing",
        "category": "Throwing",
        "prompt": SELECTABLE_MOTION_PROMPTS["throwing"],
    },
    {
        "id": "hit_homerun",
        "label": "Powerful Home Run Swing",
        "category": "Hitting",
        "prompt": SELECTABLE_MOTION_PROMPTS["hit_homerun"],
    },
    {
        "id": "field_dive",
        "label": "Diving Catch",
        "category": "Fielding",
        "prompt": SELECTABLE_MOTION_PROMPTS["field_dive"],
    },
    {
        "id": "catch_framing_throw",
        "label": "Catcher Framing and Pop Throw",
        "category": "Catching",
        "prompt": SELECTABLE_MOTION_PROMPTS["catch_framing_throw"],
    },
    {
        "id": "celebrate_homerun_trot",
        "label": "Home Run Trot",
        "category": "Celebration",
        "prompt": SELECTABLE_MOTION_PROMPTS["celebrate_homerun_trot"],
    },
    {
        "id": "celebrate_fist",
        "label": "Pumping Fist",
        "category": "Celebration",
        "prompt": SELECTABLE_MOTION_PROMPTS["celebrate_fist"],
    },
    {
        "id": "celebrate_energy",
        "label": "Explosive Celebratory Moment",
        "category": "Celebration",
        "prompt": SELECTABLE_MOTION_PROMPTS["celebrate_energy"],
    },
    # Legacy motions (not selectable; kept for existing animated cards).
    {"id": "pitch_delivery", "label": "Full Pitch Delivery", "category": "Pitching", "prompt": _LEGACY_MOTION_PROMPTS["pitch_delivery"]},
    {"id": "pitch_strikeout_roar", "label": "Strikeout Roar", "category": "Pitching", "prompt": _LEGACY_MOTION_PROMPTS["pitch_strikeout_roar"]},
    {"id": "hit_stance", "label": "Batting Stance and Follow Through", "category": "Hitting", "prompt": _LEGACY_MOTION_PROMPTS["hit_stance"]},
    {"id": "hit_walkup", "label": "Walk-Up Swagger", "category": "Hitting", "prompt": _LEGACY_MOTION_PROMPTS["hit_walkup"]},
    {"id": "hit_bat_flip", "label": "Bat Flip", "category": "Hitting", "prompt": _LEGACY_MOTION_PROMPTS["hit_bat_flip"]},
    {"id": "field_dive_celebrate", "label": "Diving Catch Celebration", "category": "Fielding", "prompt": _LEGACY_MOTION_PROMPTS["field_dive_celebrate"]},
    {"id": "field_sprint", "label": "Sprinting to Field a Ball", "category": "Fielding", "prompt": _LEGACY_MOTION_PROMPTS["field_sprint"]},
    {"id": "celebrate_crowd", "label": "Pointing to the Crowd", "category": "Celebration", "prompt": _LEGACY_MOTION_PROMPTS["celebrate_crowd"]},
    {"id": "celebrate_run", "label": "Running Full Speed", "category": "Athletic", "prompt": _LEGACY_MOTION_PROMPTS["celebrate_run"]},
]

SELECTABLE_MOTION_IDS = frozenset(MOTION_ACTION_BODIES.keys())

MOTION_ACTION_CATEGORY: dict[str, str] = {
    "pitch_windup": "pitching",
    "throwing": "throwing",
    "hit_homerun": "hitting",
    "field_dive": "fielding_ground",
    "catch_framing_throw": "catching",
    "celebrate_fist": "celebrating",
    "celebrate_energy": "general",
    "celebrate_homerun_trot": "celebrating",
}

_MOTION_BY_ID: dict[str, dict[str, str]] = {m["id"]: m for m in ANIMATION_MOTIONS}


def get_motion_by_id(motion_id: str) -> dict[str, str] | None:
    return _MOTION_BY_ID.get((motion_id or "").strip())


def is_motion_selectable(motion_id: str) -> bool:
    """True when a motion may be chosen for a new animated card."""
    return (motion_id or "").strip() in SELECTABLE_MOTION_IDS


def action_category_for_motion(motion_id: str) -> str | None:
    return MOTION_ACTION_CATEGORY.get((motion_id or "").strip())


def list_motions_public() -> list[dict[str, str]]:
    """Motion options for API responses (no internal prompts)."""
    return [
        {"id": m["id"], "label": m["label"], "category": m["category"]}
        for m in ANIMATION_MOTIONS
        if m["id"] in SELECTABLE_MOTION_IDS
    ]
