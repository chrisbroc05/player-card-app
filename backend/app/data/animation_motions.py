"""Pre-defined motion prompts for Runway image-to-video generation."""

from __future__ import annotations

# Motion-specific action text (photo-focused; athlete portrait is the Runway input).
MOTION_ACTION_BODIES: dict[str, str] = {
    "pitch_windup": (
        "The athlete winds up from set position, drives off with explosive leg drive, "
        "arm comes through in fluid overhand delivery with full follow through."
    ),
    "throwing": (
        "The athlete steps into a strong athletic throw, planting front foot, rotating hips "
        "and shoulders, full arm extension through release with clean follow through."
    ),
    "hit_homerun": (
        "The athlete loads weight back, explodes through contact zone with full hip rotation, "
        "powerful follow through with bat finishing high."
    ),
    "field_dive": (
        "The athlete reads the ball, takes explosive first step, full extension dive to make "
        "catch, slides across grass."
    ),
    "celebrate_homerun_trot": (
        "The athlete rounds bases in confident measured home run trot, slight smile, helmet tip "
        "approaching home plate."
    ),
    "celebrate_fist": (
        "The athlete pumps fist in celebration after big play, intense focused emotion, "
        "upper body motion."
    ),
    "catch_framing_throw": (
        "The athlete frames pitch with soft hands, smoothly comes up out of crouch into strong "
        "pop throw, full arm extension."
    ),
    "celebrate_energy": (
        "The athlete throws both arms up in pure celebration, jumps slightly, pure joy."
    ),
}

_CAMERA_SUFFIX = (
    "Realistic sports photography motion. Static locked-off camera. "
    "No zoom, no push in, no pan, no camera movement. "
    "No text, numbers, or lettering on jerseys or uniforms. "
    "Keep all clothing details clean and simple. "
    "Full subject remains completely in frame for entire duration. Photorealistic."
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


def build_runway_prompt(motion_id: str, photo_notes: str | None = None) -> str | None:
    """Build the full Runway prompt for a motion, optionally including photo notes."""
    key = (motion_id or "").strip()
    action_body = MOTION_ACTION_BODIES.get(key) or _LEGACY_MOTION_PROMPTS.get(key)
    if not action_body:
        return None

    notes = (photo_notes or "").strip()
    if notes:
        focus_clause = f"{notes}. Focus on this specific athlete."
    else:
        focus_clause = "Focus on the main athlete in the foreground."

    return f"{action_body} {focus_clause} {_CAMERA_SUFFIX}"


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
    "field_dive": "fielding",
    "catch_framing_throw": "catching",
    "celebrate_fist": "celebrating",
    "celebrate_energy": "celebrating",
    "celebrate_homerun_trot": "celebrating",
}

_MOTION_BY_ID: dict[str, dict[str, str]] = {m["id"]: m for m in ANIMATION_MOTIONS}


def get_motion_by_id(motion_id: str) -> dict[str, str] | None:
    return _MOTION_BY_ID.get((motion_id or "").strip())


def get_motion_prompt(motion_id: str, photo_notes: str | None = None) -> str | None:
    """Return the Runway prompt for a motion id, or None if unknown."""
    built = build_runway_prompt(motion_id, photo_notes)
    if built:
        return built
    motion = get_motion_by_id(motion_id)
    if motion is None:
        return None
    prompt = (motion.get("prompt") or "").strip()
    return prompt or None


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
