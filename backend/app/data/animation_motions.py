"""Pre-defined motion prompts for Runway image-to-video generation."""

from __future__ import annotations

ANIMATION_MOTIONS: list[dict[str, str]] = [
    {
        "id": "pitch_windup",
        "label": "Winding Up and Throwing",
        "category": "Pitching",
        "prompt": (
            "Baseball pitcher winding up and throwing a powerful pitch, "
            "dynamic athletic motion, realistic sports action"
        ),
    },
    {
        "id": "pitch_delivery",
        "label": "Full Pitch Delivery",
        "category": "Pitching",
        "prompt": (
            "Baseball pitcher in full pitch delivery motion, explosive athletic movement, "
            "professional baseball action"
        ),
    },
    {
        "id": "hit_homerun",
        "label": "Powerful Home Run Swing",
        "category": "Hitting",
        "prompt": (
            "Baseball batter swinging for a home run, powerful full swing follow through, "
            "dynamic sports motion"
        ),
    },
    {
        "id": "hit_stance",
        "label": "Batting Stance and Follow Through",
        "category": "Hitting",
        "prompt": (
            "Baseball batter in athletic batting stance swinging through, "
            "smooth athletic motion, sports action"
        ),
    },
    {
        "id": "field_dive",
        "label": "Diving Catch",
        "category": "Fielding",
        "prompt": (
            "Baseball fielder making a spectacular diving catch, explosive athletic movement, "
            "dynamic sports action"
        ),
    },
    {
        "id": "field_sprint",
        "label": "Sprinting to Field a Ball",
        "category": "Fielding",
        "prompt": (
            "Baseball player sprinting at full speed to field a ball, explosive athletic motion, "
            "professional sports action"
        ),
    },
    {
        "id": "celebrate_fist",
        "label": "Pumping Fist in Celebration",
        "category": "Celebration",
        "prompt": (
            "Baseball player pumping fist in celebration, explosive celebratory motion, "
            "sports victory moment"
        ),
    },
    {
        "id": "celebrate_crowd",
        "label": "Pointing to the Crowd",
        "category": "Celebration",
        "prompt": (
            "Baseball player pointing to the crowd in celebration, confident athletic pose "
            "with dynamic movement, sports victory moment"
        ),
    },
    {
        "id": "celebrate_run",
        "label": "Running Full Speed",
        "category": "General Athletic",
        "prompt": (
            "Baseball player running at full athletic speed, powerful dynamic motion, "
            "professional sports action"
        ),
    },
    {
        "id": "celebrate_energy",
        "label": "Explosive Celebratory Moment",
        "category": "General Athletic",
        "prompt": (
            "Baseball player in explosive celebratory athletic moment, dynamic energetic movement, "
            "sports action"
        ),
    },
]

_MOTION_BY_ID: dict[str, dict[str, str]] = {m["id"]: m for m in ANIMATION_MOTIONS}


def get_motion_by_id(motion_id: str) -> dict[str, str] | None:
    return _MOTION_BY_ID.get((motion_id or "").strip())


def list_motions_public() -> list[dict[str, str]]:
    """Motion options for API responses (no internal prompts)."""
    return [{"id": m["id"], "label": m["label"], "category": m["category"]} for m in ANIMATION_MOTIONS]
