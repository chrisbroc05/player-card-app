"""Photo scenario library for Kling prompt context (animated cards)."""

from __future__ import annotations

from typing import TypedDict


class MotionScenario(TypedDict):
    id: str
    title: str
    description: str
    prompt: str


class ActionCategory(TypedDict):
    id: str
    label: str
    description: str
    kling_motion: str
    scenarios: list[MotionScenario]


GENERIC_SCENARIO_CONTEXT = "The main athlete is the clear subject of the photo."


def _s(id: str, title: str, description: str, prompt: str) -> MotionScenario:
    return {
        "id": id,
        "title": title,
        "description": description,
        "prompt": prompt,
    }


_PITCHING_SCENARIOS: list[MotionScenario] = [
    _s(
        "pitch_windup",
        "Full wind-up delivery",
        "Standing tall in full wind-up, both hands together, about to begin delivery",
        "Cinematic slow motion sports video. The pitcher is on the pitcher's mound facing home plate. They begin their full wind-up — hands coming together then separating as the lead leg kicks up and back, the stride leg driving off the pitching rubber, stride foot landing directly toward home plate, throwing arm whipping through from behind the ear in a fluid overhand or three-quarter motion, releasing a single baseball directly toward home plate, following through with the throwing arm crossing the body, back leg swinging around to balanced fielding position over the next 5 seconds. The pitcher is throwing toward home plate — this is a mound delivery, not a fielding throw. Only one baseball shown leaving the hand.",
    ),
    _s(
        "pitch_stretch",
        "Stretch position delivery",
        "In the stretch, holding runners, about to deliver to the plate",
        "Cinematic slow motion sports video. The pitcher comes set in the stretch position, pauses briefly checking the runner, then delivers quickly to the plate with a compact efficient motion, arm driving through powerfully, releasing a single baseball, short follow through over the next 5 seconds. Only one baseball shown leaving the hand.",
    ),
    _s(
        "pitch_leg_kick",
        "Mid leg kick",
        "Leg fully raised at peak of kick, arm loading behind the head",
        "Cinematic slow motion sports video. The pitcher is at peak leg kick, leg coming back down as the stride foot plants, body rotating powerfully, throwing arm whipping through from cocked position to full extension, releasing a single baseball at the top, following through completely over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "pitch_release",
        "Release point",
        "Arm fully extended at release, ball leaving the fingertips",
        "Cinematic slow motion sports video. The pitcher completes the release, single baseball leaving the fingertips at full arm extension, wrist snapping through, arm continuing naturally down and across the body in a full follow through, back leg swinging around to balanced fielding position over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "pitch_follow_through",
        "Follow through",
        "Arm sweeping across body after release, back leg swinging around",
        "Cinematic slow motion sports video. The pitcher completes their follow through, throwing arm sweeping fully across the body, back leg finishing the rotation and landing in balanced fielding position, body squaring up to home plate ready to field over the next 5 seconds. No baseball shown — already released.",
    ),
]

_THROWING_SCENARIOS: list[MotionScenario] = [
    _s(
        "throw_catch_ready",
        "Playing catch, just caught",
        "Just caught the ball, transferring to throwing hand, setting feet to throw",
        "Cinematic slow motion sports video. The player takes the ball out of their glove with the throwing hand, feet shuffling into throwing position — back foot under the throwing-side hip, front foot stepping toward the target, arm loading to the throwing position behind the ear, then driving forward with full hip and shoulder rotation, releasing a single baseball toward the target, arm following through naturally, body balanced at finish over the next 5 seconds. Smooth relaxed playing catch motion. Only one baseball shown.",
    ),
    _s(
        "throw_catch_mid",
        "Playing catch, mid throw",
        "Arm back and loaded, weight shifting forward, about to release",
        "Cinematic slow motion sports video. The player has their weight shifting from back foot to front foot, front foot stepping directly toward their catch partner, throwing arm driving forward from behind the ear at a natural throwing arm angle, hips and shoulders rotating together, releasing a single baseball toward the target with a natural wrist snap, arm following through toward the target before naturally decelerating across the body, weight fully transferred to the front foot at finish over the next 5 seconds. Relaxed athletic catch and throw motion — not a max effort throw. Only one baseball shown.",
    ),
    _s(
        "throw_infield",
        "Infield throw across the diamond",
        "Planting and throwing across the infield to a base",
        "Cinematic slow motion sports video. The infielder is facing toward first base or another infield base — NOT toward home plate. This is a fielding throw across the diamond, not a pitching motion. The player plants their front foot firmly pointing toward the target base, hips and shoulders rotating through the throw with the chest facing the target, arm coming through at a three-quarter arm angle (not overhead like a pitcher), releasing a single baseball on a tight accurate line to the base, arm following through toward the target naturally, body decelerating after the throw over the next 5 seconds. The thrower is an infielder throwing across the diamond — body mechanics are compact and quick, not a full pitcher wind-up. Only one baseball shown.",
    ),
    _s(
        "throw_outfield",
        "Outfield throw, arm loaded",
        "Crow hop position, arm fully back, ready to fire a long throw",
        "Cinematic slow motion sports video. The outfielder completes their crow hop, plants the front foot, full hip and shoulder rotation driving the arm forward, releasing a single baseball on a high arcing throw toward the infield, arm following through completely, body decelerating naturally over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "throw_relay",
        "Relay throw",
        "Just received a relay, spinning quickly to redirect and fire",
        "Cinematic slow motion sports video. The player spins quickly from receiving the relay, planting and firing immediately with a compact powerful throw, single baseball leaving the hand on a straight line, body rotating through to complete the throw with natural follow through over the next 5 seconds. Only one baseball shown.",
    ),
]

_FIELDING_GROUND_SCENARIOS: list[MotionScenario] = [
    _s(
        "field_ready",
        "Ready stance, waiting for the pitch",
        "Athletic pre-pitch fielding stance, knees bent, glove low, weight balanced",
        "Cinematic slow motion sports video. The infielder is in an athletic pre-pitch crouch — knees bent, weight on the balls of their feet, glove low and out in front. They react explosively to a ground ball, taking a quick jab step then crossover first step in the correct direction, charging hard toward a single incoming baseball with quick choppy steps staying low, glove dropping to field it cleanly at the base of their body, soft hands absorbing the ball over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "field_forehand",
        "Forehand play, ball to glove side",
        "Moving to the glove side, glove extended out for a forehand play",
        "Cinematic slow motion sports video. The infielder shuffles laterally to their glove side with quick choppy steps staying low, glove dropping down and sweeping out to field a single ground baseball on the forehand side, soft hands with the glove angled correctly to absorb the ball, weight shifting back to the throwing-side foot as they plant, transferring quickly from glove to throwing hand and stepping toward the target to make a strong throw over the next 5 seconds. Body stays low and athletic throughout. Only one baseball shown.",
    ),
    _s(
        "field_backhand",
        "Backhand play, ball to throwing side",
        "Moving to the backhand side, glove crossing over for a backhand play",
        "Cinematic slow motion sports video. The infielder takes a quick crossover step with their glove-side foot moving toward the throwing-side, body staying low and compact, glove turning over palm-up to backhand a single ground baseball, weight on the throwing-side foot as they plant, upper body rotating quickly to transfer the ball from glove to throwing hand, stepping toward first base and firing a strong accurate throw across the diamond over the next 5 seconds. The athlete stays low throughout — this is a compact athletic infield play, not an upright motion. Only one baseball shown.",
    ),
    _s(
        "field_charge",
        "Charging a slow roller",
        "Charging aggressively toward a slow roller, about to barehand or glove it",
        "Cinematic slow motion sports video. The infielder charges aggressively at full speed toward a slowly rolling baseball, taking quick decisive steps directly at the ball, bending deeply at the waist on the final step, glove or bare hand scooping the single baseball cleanly in one fluid motion while still in stride without slowing down, body rotating immediately to plant the back foot and fire a quick strong throw to the base, all in one continuous motion over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "field_short_hop",
        "Short hop, ball right at them",
        "Set and ready, fielding a tough short hop right at their feet",
        "Cinematic slow motion sports video. The infielder gets into a low athletic position as a single baseball approaches on a difficult short hop bounce, glove positioned in front of and below the body at the correct angle to catch the ball just as it leaves the ground, soft hands giving slightly on contact to absorb the short hop cleanly, immediately transferring from glove to throwing hand with quick hands, stepping and throwing to the base over the next 5 seconds. Body stays low and compact throughout. Only one baseball shown.",
    ),
    _s(
        "field_double_play",
        "Double play pivot at second base",
        "At second base catching the throw, pivoting to fire to first",
        "Cinematic slow motion sports video. The infielder at second base catches the incoming throw, pivots quickly off the bag to avoid the runner, plants and fires a strong relay throw to first base to complete the double play, full body rotation through the throw over the next 5 seconds. Only one baseball shown.",
    ),
]

_FLY_BALL_SCENARIOS: list[MotionScenario] = [
    _s(
        "fly_tracking_back",
        "Tracking ball going back on deep fly",
        "Turned and running back toward warning track, glove up, tracking deep",
        "Cinematic slow motion sports video. The outfielder turns and sprints back toward the warning track, glove raised and open, tracking a deep fly ball over their shoulder, making the catch as the ball arrives in the glove over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "fly_charging",
        "Charging in on a sinking liner",
        "Running hard toward infield, glove low for a sinking line drive",
        "Cinematic slow motion sports video. The outfielder charges hard toward the infield, glove extended low near the ground, diving or sliding at the last moment to make a shoestring catch on a sinking line drive, coming up showing the ball in the glove over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "fly_making_catch",
        "Making the catch, glove raised",
        "Glove raised and open, ball arriving, about to make the catch",
        "Cinematic slow motion sports video. The player makes the catch as a single baseball arrives in the raised glove, squeezing it securely, showing the catch to the umpire, transitioning into position to make a throw if needed over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "fly_wall_catch",
        "Leaping wall catch, robbing a homer",
        "Jumping at the wall, glove extended above to rob a home run",
        "Cinematic slow motion sports video. The outfielder leaps at the wall, one foot possibly pushing off the fence, glove extending fully above the top of the barrier to catch a single baseball that would have been a home run, landing and holding up the glove to show the catch over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "fly_diving",
        "Diving catch, fully airborne",
        "Fully launched horizontal through the air, glove extended making catch",
        "Cinematic slow motion sports video. The outfielder launches fully horizontal through the air, glove fully extended, catching a single baseball at full extension, landing on the grass and sliding to a stop, coming up immediately to show the ball in the glove over the next 5 seconds. Only one baseball shown.",
    ),
]

_OUTFIELD_SCENARIOS: list[MotionScenario] = [
    _s(
        "out_ready",
        "Outfield ready stance",
        "In outfield ready position, hands on knees, watching the pitch",
        "Cinematic slow motion sports video. The outfielder explodes out of their ready stance reacting to the crack of the bat, taking an explosive first step in the correct direction, getting a great jump on the ball over the next 5 seconds. No baseball shown yet.",
    ),
    _s(
        "out_ground_ball",
        "Outfield ground ball, charging",
        "Charging hard toward an outfield ground ball, glove down",
        "Cinematic slow motion sports video. The outfielder charges hard toward an outfield ground ball, glove dropping down near the grass, fielding the single baseball cleanly, planting and loading for a strong throw to the infield over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "out_crow_hop",
        "Crow hop, loading to throw",
        "Mid crow hop, gathering momentum for a long outfield throw",
        "Cinematic slow motion sports video. The outfielder completes their crow hop, gathering momentum and body position, planting the front foot powerfully, full hip and shoulder rotation driving a strong long throw toward the infield, arm extending fully at release over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "out_sprint_back",
        "Full sprint going back on deep ball",
        "Turned fully, sprinting back toward warning track at full speed",
        "Cinematic slow motion sports video. The outfielder runs at full speed toward the warning track, back fully turned, head turning to track the ball over the shoulder, glove raising as they approach the spot where the ball will land over the next 5 seconds. No baseball shown yet.",
    ),
    _s(
        "out_throw_release",
        "Outfield throw at release point",
        "Arm fully extended at release of a long outfield throw",
        "Cinematic slow motion sports video. The outfielder releases a single baseball on a strong throw toward the infield, arm at full extension at the release point, wrist snapping through, arm following through naturally down and across the body, body decelerating after the throw over the next 5 seconds. Only one baseball shown.",
    ),
]

_HITTING_SCENARIOS: list[MotionScenario] = [
    _s(
        "hit_stance",
        "Batting stance, ready for the pitch",
        "In full batting stance, bat up, eyes on pitcher, weight balanced and ready",
        "Cinematic slow motion sports video. The batter begins their timing mechanism as the pitcher delivers, subtle weight shift and toe tap, hands staying back, loading smoothly into their swing as a single baseball approaches the plate over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "hit_loading",
        "Loading, weight shifted back",
        "Weight fully shifted to back foot, hands back, coiled and ready to fire",
        "Cinematic slow motion sports video. The batter completes their load and explodes forward, stride foot landing, hips firing first followed by hands, bat whipping through the hitting zone making contact with a single baseball, arms extending powerfully through contact over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "hit_mid_swing",
        "Mid swing, driving through contact",
        "Hips fully rotating, hands driving through the hitting zone",
        "Cinematic slow motion sports video. The batter drives through contact, hips fully rotating, hands extending through the hitting zone, bat making contact with a single baseball, arms fully extending, bat continuing into a high powerful follow through over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "hit_contact",
        "Contact point, bat on ball",
        "Bat meeting ball out front, hips rotated, arms extending through",
        "Cinematic slow motion sports video. The batter makes contact with a single baseball, arms fully extending through the hitting zone, hips fully rotated, wrists rolling over naturally, bat continuing up and around into a complete follow through as the baseball travels away over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "hit_follow_through",
        "Full follow through",
        "Bat fully wrapped around the body, weight transferred, watching the ball",
        "Cinematic slow motion sports video. The batter completes a full powerful follow through, bat wrapped fully around the body, weight transferred completely to the front foot, head turning to watch the single baseball travel, settling into a balanced finish position over the next 5 seconds. Only one baseball shown traveling away.",
    ),
    _s(
        "hit_bunt",
        "Bunt stance",
        "Squared around to bunt, bat flat and extended out in front",
        "Cinematic slow motion sports video. The batter squares around fully to bunt, bat held flat and extended out in front with soft hands, a single baseball arriving and being deadened off the bat softly toward the infield, the batter beginning to run toward first base over the next 5 seconds. Only one baseball shown.",
    ),
]

_CATCHING_SCENARIOS: list[MotionScenario] = [
    _s(
        "catch_set",
        "Set position, giving the target",
        "In full crouch, mitt extended and open, giving the pitcher a target",
        "Cinematic slow motion sports video. The catcher holds their set position as the pitcher delivers, mitt steady and open giving a clear target, a single baseball arriving and being received with soft hands, the catcher framing naturally for the umpire over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "catch_receiving",
        "Receiving a pitch",
        "Catching a pitch, mitt absorbing the ball, body still",
        "Cinematic slow motion sports video. The catcher receives a single incoming baseball, mitt positioned perfectly, soft hands absorbing the pitch, settling the ball in the mitt and holding the framed position briefly for the umpire over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "catch_framing",
        "Framing a pitch",
        "Subtly moving the mitt to frame a pitch as a strike",
        "Cinematic slow motion sports video. The catcher receives a single baseball on the edge of the strike zone, using subtle soft hands to move the mitt slightly inward after catching it, presenting it as a strike for the umpire without over-moving, holding the position steadily over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "catch_pop_throw",
        "Pop throw to second base",
        "Rising out of crouch, arm loading to fire a throw to second",
        "Cinematic slow motion sports video. The catcher receives a single baseball in their mitt behind home plate, immediately transferring the ball from mitt to throwing hand with quick hands, simultaneously rising from the crouch by pushing off both feet, feet shuffling into throwing position with the throwing-side foot stepping back and the glove-side foot stepping toward second base, arm loading quickly to throwing position, firing a strong accurate throw on a direct line toward second base with full arm extension, wrist snapping at release, arm following through toward second base over the next 5 seconds. Quick compact throwing motion — the catcher is throwing to SECOND BASE not home plate. Only one baseball shown.",
    ),
    _s(
        "catch_blocking",
        "Blocking a ball in the dirt",
        "Dropped to both knees blocking a wild pitch, body square and low",
        "Cinematic slow motion sports video. The catcher drops to both knees blocking a single baseball in the dirt, body squaring up as a wall, chin tucked, the ball hitting the chest protector and staying in front, the catcher recovering quickly to locate and control the ball over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "catch_bunt",
        "Fielding a bunt",
        "Out from behind the plate charging a bunt, about to pick it up",
        "Cinematic slow motion sports video. The catcher springs out from behind the plate charging a bunt, mask discarding as they run, bare handing or gloving a single baseball, planting and firing a quick strong throw to the base in one continuous fluid motion over the next 5 seconds. Only one baseball shown.",
    ),
]

_CELEBRATING_SCENARIOS: list[MotionScenario] = [
    _s(
        "cel_single_pump",
        "Single fist pump, intense",
        "One controlled fist pump downward, jaw set, pure competitive fire",
        "Cinematic slow motion sports video. The player delivers one powerful controlled fist pump downward, jaw set and intense, eyes focused, pure competitive fire in the moment, holding the emotion for a beat before composing themselves over the next 5 seconds. No baseball shown.",
    ),
    _s(
        "cel_double_pump",
        "Double fist pump, both hands",
        "Both fists pumping simultaneously, maximum emotion and intensity",
        "Cinematic slow motion sports video. The player pumps both fists downward simultaneously in an explosive double celebration, teeth clenched, maximum emotion and intensity, the raw release of a big competitive moment over the next 5 seconds. No baseball shown.",
    ),
    _s(
        "cel_arms_raised",
        "Arms raised to the sky",
        "Both arms raised fully overhead, head back, soaking in the moment",
        "Cinematic slow motion sports video. The player raises both arms fully overhead reaching toward the sky, head tilting back looking upward, soaking in a significant moment of triumph, holding the pose in pure joy over the next 5 seconds. No baseball shown.",
    ),
    _s(
        "cel_jump_pump",
        "Jump and fist pump",
        "Fully airborne jumping while fist pumping, full body celebration",
        "Cinematic slow motion sports video. The player launches into the air in a celebratory jump, fist pumping powerfully while fully airborne, landing and immediately pumping again, full body expression of pure joy and competitive release over the next 5 seconds. No baseball shown.",
    ),
    _s(
        "cel_running_mob",
        "Running toward teammates",
        "Arms wide open running toward teammates rushing in to celebrate",
        "Cinematic slow motion sports video. The player runs with arms wide open toward teammates rushing in to celebrate, the collision of the group celebration, hugging and mobbing together in a joyful team moment over the next 5 seconds. No baseball shown.",
    ),
    _s(
        "cel_trot",
        "Home run trot",
        "Measured confident steps rounding the bases after a home run",
        "Cinematic slow motion sports video. The player continues their home run trot with measured confident steps, head up, slight smile, rounding toward the next base with total composure and the quiet confidence of knowing the ball is gone over the next 5 seconds. No baseball shown.",
    ),
    _s(
        "cel_pointing",
        "Pointing to someone in the stands",
        "After crossing the plate, pointing up to someone specific in the crowd",
        "Cinematic slow motion sports video. The player points directly up into the stands toward a specific person after crossing the plate, locking eyes with them, sharing a personal meaningful moment of connection after the big play over the next 5 seconds. No baseball shown.",
    ),
]

_GENERAL_SCENARIOS: list[MotionScenario] = [
    _s(
        "gen_sprint",
        "Running full sprint",
        "At full speed running, arms pumping, sprinting across the field",
        "Cinematic slow motion sports video. The player runs at full athletic speed, arms pumping in rhythm, legs driving powerfully, uniform flowing with the motion, pure athleticism on display over the next 5 seconds. No baseball shown.",
    ),
    _s(
        "gen_stretching",
        "Stretching or warming up",
        "In a stretching position, warming up before the game",
        "Cinematic slow motion sports video. The player moves through their stretching or warm-up routine, fluid athletic movement, preparing their body for the game ahead, relaxed and focused energy over the next 5 seconds. No baseball shown.",
    ),
    _s(
        "gen_dugout",
        "Dugout celebration or reaction",
        "In the dugout reacting to a big play, cheering with teammates",
        "Cinematic slow motion sports video. The player reacts in the dugout to a big play on the field, jumping up, cheering, high-fiving teammates, pure team energy and excitement in the dugout atmosphere over the next 5 seconds. No baseball shown.",
    ),
    _s(
        "gen_handshake",
        "Post-game handshake line",
        "Going through the handshake line with the other team after the game",
        "Cinematic slow motion sports video. The player moves through the post-game handshake line, tapping gloves or shaking hands with opposing players, showing sportsmanship and respect after the game over the next 5 seconds. No baseball shown.",
    ),
    _s(
        "gen_posed",
        "Posed photo, standing tall",
        "Standing tall in uniform, posed for a photo, confident and proud",
        "Cinematic slow motion sports video. The player stands tall and confident in their uniform, subtle natural movement — slight breathing, weight shifting naturally, looking composed and proud, a living portrait of a baseball player over the next 5 seconds. No baseball shown.",
    ),
]


ACTION_CATEGORIES: dict[str, ActionCategory] = {
    "pitching": {
        "id": "pitching",
        "label": "Pitching",
        "description": "Delivering a pitch from the mound",
        "kling_motion": "pitch_windup",
        "scenarios": _PITCHING_SCENARIOS,
    },
    "throwing": {
        "id": "throwing",
        "label": "Throwing",
        "description": "Throwing the ball from any position",
        "kling_motion": "throwing",
        "scenarios": _THROWING_SCENARIOS,
    },
    "fielding_ground": {
        "id": "fielding_ground",
        "label": "Fielding a Ground Ball",
        "description": "Getting ready for or fielding a ground ball in the infield",
        "kling_motion": "field_dive",
        "scenarios": _FIELDING_GROUND_SCENARIOS,
    },
    "fly_ball": {
        "id": "fly_ball",
        "label": "Catching a Fly Ball",
        "description": "Tracking or catching a fly ball",
        "kling_motion": "field_dive",
        "scenarios": _FLY_BALL_SCENARIOS,
    },
    "outfield": {
        "id": "outfield",
        "label": "Outfield",
        "description": "Playing the outfield — fielding, throwing, or tracking",
        "kling_motion": "throwing",
        "scenarios": _OUTFIELD_SCENARIOS,
    },
    "hitting": {
        "id": "hitting",
        "label": "Hitting",
        "description": "At the plate — batting stance, swing, or follow through",
        "kling_motion": "hit_homerun",
        "scenarios": _HITTING_SCENARIOS,
    },
    "catching": {
        "id": "catching",
        "label": "Catching (Catcher)",
        "description": "Behind the plate — receiving, framing, blocking, or throwing",
        "kling_motion": "catch_framing_throw",
        "scenarios": _CATCHING_SCENARIOS,
    },
    "celebrating": {
        "id": "celebrating",
        "label": "Celebrating",
        "description": "Celebrating a big moment — any celebration",
        "kling_motion": "celebrate_fist",
        "scenarios": _CELEBRATING_SCENARIOS,
    },
    "general": {
        "id": "general",
        "label": "General / Practice",
        "description": "Practice, warmup, dugout, or any other baseball moment",
        "kling_motion": "celebrate_energy",
        "scenarios": _GENERAL_SCENARIOS,
    },
}


LEGACY_MOTION_TO_CATEGORY: dict[str, str] = {
    "pitch_windup": "pitching",
    "throwing": "throwing",
    "hit_homerun": "hitting",
    "field_dive": "fielding_ground",
    "catch_framing_throw": "catching",
    "celebrate_fist": "celebrating",
    "celebrate_homerun_trot": "celebrating",
    "celebrate_energy": "general",
}

# Backward-compatible motion-id keyed scenario lists (legacy API / tests).
MOTION_SCENARIOS: dict[str, list[MotionScenario]] = {
    motion_id: ACTION_CATEGORIES[category_id]["scenarios"]
    for motion_id, category_id in LEGACY_MOTION_TO_CATEGORY.items()
}

_SCENARIO_BY_CATEGORY: dict[str, dict[str, MotionScenario]] = {
    category_id: {scenario["id"]: scenario for scenario in category["scenarios"]}
    for category_id, category in ACTION_CATEGORIES.items()
}

_SCENARIO_BY_MOTION: dict[str, dict[str, MotionScenario]] = {
    motion_id: _SCENARIO_BY_CATEGORY[category_id]
    for motion_id, category_id in LEGACY_MOTION_TO_CATEGORY.items()
}


def list_action_categories() -> list[dict[str, str]]:
    """Public category list for API (no scenario prompts)."""
    return [
        {
            "id": category["id"],
            "label": category["label"],
            "description": category["description"],
            "kling_motion": category["kling_motion"],
        }
        for category in ACTION_CATEGORIES.values()
    ]


def get_action_category(category_id: str) -> ActionCategory | None:
    return ACTION_CATEGORIES.get((category_id or "").strip())


def kling_motion_for_category(category_id: str) -> str | None:
    category = get_action_category(category_id)
    return category["kling_motion"] if category else None


def list_scenarios_for_category(category_id: str) -> list[dict[str, str]]:
    """Public scenario list for a category (no prompts)."""
    category = get_action_category(category_id)
    if not category:
        return []
    return [
        {"id": s["id"], "title": s["title"], "description": s["description"]}
        for s in category["scenarios"]
    ]


def get_scenario_by_category(
    category_id: str,
    scenario_id: str | None,
) -> MotionScenario | None:
    """Return full scenario for a category, or None for generic / unknown ids."""
    key = (scenario_id or "").strip()
    if not key or key == "none":
        return None
    cat_key = (category_id or "").strip()
    return _SCENARIO_BY_CATEGORY.get(cat_key, {}).get(key)


def category_has_scenarios(category_id: str) -> bool:
    category = get_action_category(category_id)
    return bool(category and category["scenarios"])


def get_scenario(motion_id: str, scenario_id: str | None) -> MotionScenario | None:
    """Legacy wrapper: resolve category from motion id, then look up scenario."""
    category_id = LEGACY_MOTION_TO_CATEGORY.get((motion_id or "").strip())
    if not category_id:
        return None
    return get_scenario_by_category(category_id, scenario_id)


def list_scenarios_for_motion(motion_id: str) -> list[dict[str, str]]:
    """Legacy wrapper: scenarios for a motion id via category mapping."""
    category_id = LEGACY_MOTION_TO_CATEGORY.get((motion_id or "").strip())
    if not category_id:
        return []
    return list_scenarios_for_category(category_id)


def motion_has_scenarios(motion_id: str) -> bool:
    """Legacy wrapper: whether a motion id has scenarios."""
    return (motion_id or "").strip() in LEGACY_MOTION_TO_CATEGORY
