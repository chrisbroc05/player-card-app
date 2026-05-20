"""Pre-defined motion prompts for Runway image-to-video generation."""

from __future__ import annotations

_BASE = (
    "Cinematic sports card animation. The athlete is a youth baseball player "
    "in full uniform, photographed from the front. The background is stylized "
    "and dynamic. The player performs the following action with realistic, "
    "mechanically correct baseball form: "
)


def _prompt(detail: str) -> str:
    return _BASE + detail


ANIMATION_MOTIONS: list[dict[str, str]] = [
    # Pitching
    {
        "id": "pitch_windup",
        "label": "Winding Up and Throwing",
        "category": "Pitching",
        "prompt": _prompt(
            "a full pitcher's windup: weight shifts to back leg, lead knee "
            "drives up high, hips rotate before shoulders, arm comes over the top "
            "in a 12-to-6 delivery, full follow-through with glove tucking in. "
            "Smooth, fluid, powerful."
        ),
    },
    {
        "id": "pitch_delivery",
        "label": "Full Pitch Delivery",
        "category": "Pitching",
        "prompt": _prompt(
            "a stretch-position pitch delivery: compact leg lift, explosive "
            "hip rotation, high arm slot, full extension at release, chest over "
            "knee on follow-through."
        ),
    },
    {
        "id": "pitch_strikeout_roar",
        "label": "Strikeout Roar",
        "category": "Pitching",
        "prompt": _prompt(
            "a pitcher's strikeout celebration: punches down hard with "
            "throwing arm, lets out a roar, turns toward the dugout with pure "
            "intensity and fire."
        ),
    },
    # Hitting
    {
        "id": "hit_homerun",
        "label": "Powerful Home Run Swing",
        "category": "Hitting",
        "prompt": _prompt(
            "a mechanically sound home run swing: load back with a slight "
            "leg kick, hands stay inside the ball, hips fire first driving the "
            "barrel through the zone at a slight uppercut angle, full extension, "
            "high complete follow-through finishing over the front shoulder."
        ),
    },
    {
        "id": "hit_stance",
        "label": "Batting Stance and Follow Through",
        "category": "Hitting",
        "prompt": _prompt(
            "a clean contact swing: balanced stance, controlled stride, "
            "short direct path to contact, solid extension through the ball, "
            "balanced finish."
        ),
    },
    {
        "id": "hit_walkup",
        "label": "Walk-Up Swagger",
        "category": "Hitting",
        "prompt": _prompt(
            "a batter approaching the plate with confidence: knocks dirt from "
            "cleats, taps plate with bat, takes a slow practice swing, locks eyes "
            "forward, settles into stance. Cool and composed."
        ),
    },
    {
        "id": "hit_bat_flip",
        "label": "Bat Flip",
        "category": "Hitting",
        "prompt": _prompt(
            "a clean home run bat flip: makes contact, watches the ball for "
            "a beat, then releases the bat with one hand in a slow controlled flip, "
            "begins trot. Confident. Stylish. No urgency."
        ),
    },
    # Fielding
    {
        "id": "field_dive",
        "label": "Diving Catch",
        "category": "Fielding",
        "prompt": _prompt(
            "a full-extension diving catch in the outfield: explosive first "
            "step, full horizontal dive, glove outstretched to snag the ball just "
            "off the ground, slides to a stop. Dirt kicks up on landing."
        ),
    },
    {
        "id": "field_dive_celebrate",
        "label": "Diving Catch Celebration",
        "category": "Fielding",
        "prompt": _prompt(
            "a fielder pops up from a diving catch: springs to their feet "
            "immediately after the slide, ball raised in glove, pumps fist toward "
            "the infield, huge energy."
        ),
    },
    {
        "id": "field_sprint",
        "label": "Sprinting to Field a Ball",
        "category": "Fielding",
        "prompt": _prompt(
            "a quick explosive sprint into fielding position: athletic first "
            "step, low aggressive angle, glove down to field a ground ball cleanly, "
            "plants and squares up to throw."
        ),
    },
    # Catching
    {
        "id": "catch_framing_throw",
        "label": "Catcher Framing and Pop Throw",
        "category": "Catching",
        "prompt": _prompt(
            "a catcher receiving a pitch with a subtle glove-framing motion "
            "at the edge of the zone, then exploding into a snap throw to second "
            "base: quick transfer from glove to throwing hand, short arm stroke, "
            "laser throw down. Athletic and technical."
        ),
    },
    # Celebration
    {
        "id": "celebrate_homerun_trot",
        "label": "Home Run Trot",
        "category": "Celebration",
        "prompt": _prompt(
            "a slow admiring home run trot out of the box: watches the ball "
            "off the bat, takes a few slow steps, tips helmet slightly, soaks in "
            "the moment before beginning the trot."
        ),
    },
    {
        "id": "celebrate_crowd",
        "label": "Pointing to the Crowd",
        "category": "Celebration",
        "prompt": _prompt(
            "a confident celebratory point toward the stands after a home "
            "run: stands at home plate, bat still in hand or dropped, points two "
            "fingers out to the crowd with swagger and showmanship."
        ),
    },
    {
        "id": "celebrate_fist",
        "label": "Pumping Fist",
        "category": "Celebration",
        "prompt": _prompt(
            "a fired-up fist pump after a big strikeout: glove hand slaps "
            "thigh, throwing fist pumps down hard toward the ground, head drops "
            "then snaps up with intensity."
        ),
    },
    {
        "id": "celebrate_energy",
        "label": "Explosive Celebratory Moment",
        "category": "Celebration",
        "prompt": _prompt(
            "a spontaneous celebration: jumps, claps, points skyward, or "
            "raises both arms — raw joy and energy after a big play. Dynamic "
            "and expressive."
        ),
    },
    # Athletic
    {
        "id": "celebrate_run",
        "label": "Running Full Speed",
        "category": "Athletic",
        "prompt": _prompt(
            "a full-speed baserunning sprint: powerful arm drive, high knees, "
            "forward lean, explosive stride, eyes ahead. Pure game-speed athleticism."
        ),
    },
]

_MOTION_BY_ID: dict[str, dict[str, str]] = {m["id"]: m for m in ANIMATION_MOTIONS}


def get_motion_by_id(motion_id: str) -> dict[str, str] | None:
    return _MOTION_BY_ID.get((motion_id or "").strip())


def list_motions_public() -> list[dict[str, str]]:
    """Motion options for API responses (no internal prompts)."""
    return [{"id": m["id"], "label": m["label"], "category": m["category"]} for m in ANIMATION_MOTIONS]
