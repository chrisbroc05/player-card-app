"""Pre-defined motion prompts for Runway image-to-video generation."""

from __future__ import annotations

# Shared instruction: keep the full trading card (borders, name plate) in frame.
_FRAME = (
    "Keep the entire trading card visible in frame at all times — borders, name text, "
    "and design elements must not be cropped. Subtle motion only on the illustrated player. "
)

ANIMATION_MOTIONS: list[dict[str, str]] = [
    {
        "id": "pitch_windup",
        "label": "Winding Up and Throwing",
        "category": "Pitching",
        "prompt": (
            _FRAME
            + "Pitching windup mechanics: balanced stance, stride leg lifts, glove hand rises, "
            "throwing arm reaches back in a high cocked position, hips rotate closed then open, "
            "arm accelerates forward through release with follow-through across the body. "
            "Smooth sequential windup-to-throw, realistic baseball pitching form."
        ),
    },
    {
        "id": "pitch_delivery",
        "label": "Full Pitch Delivery",
        "category": "Pitching",
        "prompt": (
            _FRAME
            + "Full pitch delivery mechanics: explosive drive off the rubber, lead leg braces, "
            "torso rotates toward home plate, throwing arm whips through release point, "
            "back leg kicks up for balance, chest finishes over the front knee. "
            "Powerful professional delivery motion, one continuous athletic sequence."
        ),
    },
    {
        "id": "hit_homerun",
        "label": "Powerful Home Run Swing",
        "category": "Hitting",
        "prompt": (
            _FRAME
            + "Home run swing mechanics: load with slight coil, front foot plants, hips explode open, "
            "hands drive the bat on a level plane, barrel whips through the zone, "
            "full extension and high finish over the back shoulder. "
            "Maximum bat speed, powerful follow-through, realistic power-hitter swing."
        ),
    },
    {
        "id": "hit_stance",
        "label": "Batting Stance and Follow Through",
        "category": "Hitting",
        "prompt": (
            _FRAME
            + "Batting swing mechanics: athletic stance with slight knee bend, small load stride, "
            "weight transfer to front side, level swing path through the strike zone, "
            "wrists roll through contact, balanced one-handed or two-handed finish. "
            "Controlled smooth hitter's swing, realistic timing and form."
        ),
    },
    {
        "id": "field_dive",
        "label": "Diving Catch",
        "category": "Fielding",
        "prompt": (
            _FRAME
            + "Diving catch mechanics: reads the ball, first step burst, full extension layout "
            "with glove arm reaching forward, off-hand stabilizes, body parallel to ground, "
            "glove secures the ball at the end of the dive. "
            "Dramatic but realistic fielding dive, athletic full-extension."
        ),
    },
    {
        "id": "field_sprint",
        "label": "Sprinting to Field a Ball",
        "category": "Fielding",
        "prompt": (
            _FRAME
            + "Sprint-and-field mechanics: explosive first step, pumping arms, knees drive high, "
            "player breaks down with choppy steps approaching the ball, glove lowers in front, "
            "smooth fielding position. "
            "Full-speed sprint decelerating into a field, realistic outfield or infield run."
        ),
    },
    {
        "id": "celebrate_fist",
        "label": "Pumping Fist in Celebration",
        "category": "Celebration",
        "prompt": (
            _FRAME
            + "Celebration mechanics: moment of triumph, fist pumps upward from the chest, "
            "slight bounce on the legs, head tilts back, shoulders rise with intensity, "
            "brief held pose then second pump. "
            "Victory fist pump, energetic but controlled celebratory motion."
        ),
    },
    {
        "id": "celebrate_crowd",
        "label": "Pointing to the Crowd",
        "category": "Celebration",
        "prompt": (
            _FRAME
            + "Crowd-point celebration mechanics: arm extends toward the stands, index finger points, "
            "chest opens proudly, slight turn of the torso toward the crowd, "
            "confident stride or planted stance. "
            "Acknowledging the fans, bold celebratory gesture, athletic pride."
        ),
    },
    {
        "id": "celebrate_run",
        "label": "Running Full Speed",
        "category": "General Athletic",
        "prompt": (
            _FRAME
            + "Sprint mechanics: forward lean, rapid leg turnover, arms pump opposite legs, "
            "head steady, accelerating run across the frame. "
            "Full-speed baseball run — rounding bases or breaking out of the box, dynamic athletic sprint."
        ),
    },
    {
        "id": "celebrate_energy",
        "label": "Explosive Celebratory Moment",
        "category": "General Athletic",
        "prompt": (
            _FRAME
            + "Explosive celebration mechanics: jump off both feet with arms raised, "
            "mid-air peak with legs tucked slightly, landing with flexed knees, "
            "immediate energetic arm movement. "
            "Big-game celebration jump, high energy, joyful athletic burst."
        ),
    },
]

_MOTION_BY_ID: dict[str, dict[str, str]] = {m["id"]: m for m in ANIMATION_MOTIONS}


def get_motion_by_id(motion_id: str) -> dict[str, str] | None:
    return _MOTION_BY_ID.get((motion_id or "").strip())


def list_motions_public() -> list[dict[str, str]]:
    """Motion options for API responses (no internal prompts)."""
    return [{"id": m["id"], "label": m["label"], "category": m["category"]} for m in ANIMATION_MOTIONS]
