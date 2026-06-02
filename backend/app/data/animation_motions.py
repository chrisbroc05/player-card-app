"""Pre-defined motion prompts for Runway image-to-video generation."""

from __future__ import annotations

# Exact Runway prompts for selectable studio motions (do not paraphrase).
SELECTABLE_MOTION_PROMPTS: dict[str, str] = {
    "pitch_windup": (
        "Realistic sports photography motion. Baseball pitcher winds up from set position, "
        "drives off rubber with explosive leg drive, arm comes through in fluid overhand "
        "delivery, full follow through. Cinematic slow motion. Photorealistic."
    ),
    "hit_homerun": (
        "Realistic sports photography motion. Baseball batter loads weight back, explodes "
        "through contact zone with full hip rotation, powerful follow through with bat finishing "
        "high over shoulder. Slow motion broadcast style. Photorealistic."
    ),
    "field_dive": (
        "Realistic sports photography motion. Baseball outfielder reads ball off bat, takes "
        "explosive first step, full extension dive to make catch, slides across grass. "
        "Broadcast slow motion. Photorealistic."
    ),
    "celebrate_homerun_trot": (
        "Realistic sports photography motion. Baseball player rounds bases in confident "
        "measured home run trot, slight smile, helmet tip as they approach home plate. "
        "Smooth steady cam follow. Photorealistic."
    ),
    "celebrate_fist": (
        "Realistic sports photography motion. Baseball player pumps fist in celebration after "
        "big play, intense focused emotion, upper body motion only. Slow motion close up. "
        "Photorealistic."
    ),
    "catch_framing_throw": (
        "Realistic sports photography motion. Baseball catcher frames pitch in strike zone "
        "with soft hands, smoothly comes up out of crouch into strong pop throw to second base, "
        "full arm extension. Broadcast angle slow motion. Photorealistic."
    ),
    "celebrate_energy": (
        "Realistic sports photography motion. Baseball player throws both arms up in pure "
        "celebration after winning moment, jumps slightly, teammates react in background. "
        "Broadcast slow motion. Photorealistic."
    ),
}

# Legacy prompts retained for cards created before the motion library trim.
_LEGACY_MOTION_PROMPTS: dict[str, str] = {
    "pitch_delivery": (
        "Cinematic sports card animation. The athlete is a youth baseball player "
        "in full uniform, photographed from the front. The background is stylized "
        "and dynamic. The player performs the following action with realistic, "
        "mechanically correct baseball form: a stretch-position pitch delivery: compact leg lift, "
        "explosive hip rotation, high arm slot, full extension at release, chest over "
        "knee on follow-through."
    ),
    "pitch_strikeout_roar": (
        "Cinematic sports card animation. The athlete is a youth baseball player "
        "in full uniform, photographed from the front. The background is stylized "
        "and dynamic. The player performs the following action with realistic, "
        "mechanically correct baseball form: a pitcher's strikeout celebration: punches down hard with "
        "throwing arm, lets out a roar, turns toward the dugout with pure intensity and fire."
    ),
    "hit_stance": (
        "Cinematic sports card animation. The athlete is a youth baseball player "
        "in full uniform, photographed from the front. The background is stylized "
        "and dynamic. The player performs the following action with realistic, "
        "mechanically correct baseball form: a clean contact swing: balanced stance, controlled stride, "
        "short direct path to contact, solid extension through the ball, balanced finish."
    ),
    "hit_walkup": (
        "Cinematic sports card animation. The athlete is a youth baseball player "
        "in full uniform, photographed from the front. The background is stylized "
        "and dynamic. The player performs the following action with realistic, "
        "mechanically correct baseball form: a batter approaching the plate with confidence: knocks dirt from "
        "cleats, taps plate with bat, takes a slow practice swing, locks eyes forward, settles into stance."
    ),
    "hit_bat_flip": (
        "Cinematic sports card animation. The athlete is a youth baseball player "
        "in full uniform, photographed from the front. The background is stylized "
        "and dynamic. The player performs the following action with realistic, "
        "mechanically correct baseball form: a clean home run bat flip: makes contact, watches the ball for "
        "a beat, then releases the bat with one hand in a slow controlled flip, begins trot."
    ),
    "field_dive_celebrate": (
        "Cinematic sports card animation. The athlete is a youth baseball player "
        "in full uniform, photographed from the front. The background is stylized "
        "and dynamic. The player performs the following action with realistic, "
        "mechanically correct baseball form: a fielder pops up from a diving catch: springs to their feet "
        "immediately after the slide, ball raised in glove, pumps fist toward the infield, huge energy."
    ),
    "field_sprint": (
        "Cinematic sports card animation. The athlete is a youth baseball player "
        "in full uniform, photographed from the front. The background is stylized "
        "and dynamic. The player performs the following action with realistic, "
        "mechanically correct baseball form: a quick explosive sprint into fielding position: athletic first "
        "step, low aggressive angle, glove down to field a ground ball cleanly, plants and squares up to throw."
    ),
    "celebrate_crowd": (
        "Cinematic sports card animation. The athlete is a youth baseball player "
        "in full uniform, photographed from the front. The background is stylized "
        "and dynamic. The player performs the following action with realistic, "
        "mechanically correct baseball form: a confident celebratory point toward the stands after a home run."
    ),
    "celebrate_run": (
        "Cinematic sports card animation. The athlete is a youth baseball player "
        "in full uniform, photographed from the front. The background is stylized "
        "and dynamic. The player performs the following action with realistic, "
        "mechanically correct baseball form: a full-speed baserunning sprint: powerful arm drive, high knees, "
        "forward lean, explosive stride, eyes ahead."
    ),
}

ANIMATION_MOTIONS: list[dict[str, str]] = [
    {
        "id": "pitch_windup",
        "label": "Winding Up and Throwing",
        "category": "Pitching",
        "prompt": SELECTABLE_MOTION_PROMPTS["pitch_windup"],
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

SELECTABLE_MOTION_IDS = frozenset(SELECTABLE_MOTION_PROMPTS.keys())

MOTION_ACTION_CATEGORY: dict[str, str] = {
    "pitch_windup": "pitching",
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


def get_motion_prompt(motion_id: str) -> str | None:
    """Return the Runway prompt for a motion id, or None if unknown."""
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
