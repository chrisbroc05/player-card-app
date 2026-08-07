"""Photo scenario library for Runway prompt context (animated cards)."""

from __future__ import annotations

from typing import TypedDict


class MotionScenario(TypedDict):
    id: str
    title: str
    description: str
    prompt_context: str


GENERIC_SCENARIO_CONTEXT = (
    "The main athlete is the clear subject of the photo."
)


MOTION_TO_SCENARIO_GROUP: dict[str, str] = {
    "pitch_windup": "pitching",
    "throwing": "throwing",
    "hit_homerun": "hitting",
    "field_dive": "fielding",
    "catch_framing_throw": "catching",
    "celebrate_fist": "pumping_fist",
    "celebrate_homerun_trot": "home_run_trot",
    "celebrate_energy": "celebrating",
}

SCENARIO_GROUPS: dict[str, list[MotionScenario]] = {
    "pitching": [
        {
            "id": "pitching_windup_set",
            "title": "Wind-up, hands together",
            "description": "Standing tall on the rubber, both hands together at chest, weight centered, about to begin the wind-up",
            "prompt_context": "The athlete is standing tall on the pitcher's rubber in the wind-up position, both hands together at the chest, weight centered, about to begin the full wind-up delivery.",
        },
        {
            "id": "pitching_leg_kick",
            "title": "Leg kick, arm back",
            "description": "Leg fully raised at peak of kick, throwing arm pulled back behind the body, loading up",
            "prompt_context": "The athlete's leg is fully raised at the peak of the leg kick, throwing arm pulled back behind the body and fully loaded, about to drive forward into the delivery.",
        },
        {
            "id": "pitching_stride",
            "title": "Striding forward, arm cocked",
            "description": "Front leg striding toward plate, throwing arm fully cocked at 90 degrees",
            "prompt_context": "The athlete is mid-stride toward home plate, front leg extended forward, throwing arm fully cocked at 90 degrees behind the head, about to fire the pitch.",
        },
        {
            "id": "pitching_release",
            "title": "Release point",
            "description": "Arm fully extended at release, ball just leaving the fingertips",
            "prompt_context": "The athlete is at the exact release point, throwing arm fully extended toward home plate, ball just leaving the fingertips at the top of the delivery.",
        },
        {
            "id": "pitching_follow_through",
            "title": "Follow through, arm across body",
            "description": "Throwing arm sweeping across body after release, back leg coming around",
            "prompt_context": "The athlete has just released the pitch and is in the follow through, throwing arm sweeping naturally across the body, back leg swinging around for balance.",
        },
        {
            "id": "pitching_stretch",
            "title": "Stretch position, looking in",
            "description": "Standing in the stretch, glove up, looking toward home for the sign",
            "prompt_context": "The athlete is standing in the stretch position on the rubber, glove held up, looking in toward home plate for the catcher's sign.",
        },
        {
            "id": "pitching_set",
            "title": "Set position, holding runners",
            "description": "Holding the set position, looking toward first before delivering",
            "prompt_context": "The athlete is holding the set position on the rubber, pausing with both hands together, checking the runner before delivering to the plate.",
        },
        {
            "id": "pitching_pickoff",
            "title": "Pickoff move to first",
            "description": "Pivoting off the rubber, arm coming forward in a snap throw to first base",
            "prompt_context": "The athlete is executing a pickoff move, pivoting quickly off the rubber and firing a snap throw toward first base.",
        },
    ],
    "throwing": [
        {
            "id": "throwing_fielded_loading",
            "title": "Just fielded, about to throw",
            "description": "Just picked up the ball, feet setting up, ball in throwing hand at waist",
            "prompt_context": "The athlete has just fielded the ball and is setting their feet to throw, ball in the throwing hand at waist level, body turning toward the target.",
        },
        {
            "id": "throwing_arm_back",
            "title": "Loading up, arm fully back",
            "description": "Weight shifted to back foot, throwing arm fully extended behind body",
            "prompt_context": "The athlete has their weight shifted to the back foot, throwing arm fully extended behind the body, glove arm pointing toward the target, fully loaded to throw.",
        },
        {
            "id": "throwing_mid_throw",
            "title": "Mid-throw, arm coming forward",
            "description": "Body rotating, throwing arm driving forward, front foot planted",
            "prompt_context": "The athlete is mid-throw, body fully rotating, throwing arm driving forward powerfully, front foot planted, generating maximum velocity toward the target.",
        },
        {
            "id": "throwing_release",
            "title": "Release point, arm extended",
            "description": "Arm fully extended at release, ball leaving the hand",
            "prompt_context": "The athlete is at the exact release point of the throw, arm fully extended toward the target, ball leaving the fingertips, body square to the throwing direction.",
        },
        {
            "id": "throwing_follow_through",
            "title": "Follow through, ball already gone",
            "description": "Ball already released, arm naturally following down across the body",
            "prompt_context": "The athlete has already released the ball and is in the natural follow through, throwing arm sweeping down and across the body, weight transferring to the front foot.",
        },
        {
            "id": "throwing_short_hop",
            "title": "Short hop recovery throw",
            "description": "Low to the ground after fielding a short hop, coming up to throw",
            "prompt_context": "The athlete is low to the ground having just fielded a short hop, quickly coming up from a bent position to make a fast throw to the target.",
        },
        {
            "id": "throwing_one_knee",
            "title": "Throwing from one knee",
            "description": "Down on one knee from a diving stop, making the throw",
            "prompt_context": "The athlete is down on one knee after a diving stop, throwing arm fully extended making a strong throw to the base from that low position.",
        },
        {
            "id": "throwing_crow_hop",
            "title": "Crow hop, outfield throw",
            "description": "Mid crow-hop in the outfield, gathering momentum for a long throw",
            "prompt_context": "The athlete is mid crow-hop in the outfield, one foot off the ground as they gather momentum and body positioning for a long powerful throw to the infield.",
        },
        {
            "id": "throwing_relay",
            "title": "Relay throw, spinning",
            "description": "Catching a relay and spinning quickly to fire the next throw",
            "prompt_context": "The athlete is executing a relay throw, having just caught the incoming throw and spinning their body quickly to redirect and fire to the next base.",
        },
        {
            "id": "throwing_barehand",
            "title": "Barehand charge throw",
            "description": "Charging a slow roller, barehanding the ball, throwing in one motion",
            "prompt_context": "The athlete is charging aggressively toward a slow roller, barehanding the ball in stride and throwing to first base in one continuous fluid motion without stopping.",
        },
    ],
    "hitting": [
        {
            "id": "hitting_stance",
            "title": "Pre-pitch stance",
            "description": "In batting stance, bat up, eyes on pitcher, weight balanced",
            "prompt_context": "The athlete is standing in their batting stance in the batter's box, bat held up and back, eyes locked on the pitcher, weight balanced and ready.",
        },
        {
            "id": "hitting_loading",
            "title": "Loading, weight shifted back",
            "description": "Weight fully shifted to back foot, hands back, coiled and ready",
            "prompt_context": "The athlete has fully loaded their swing, weight shifted back to the rear foot, hands back, bat cocked, body coiled and ready to explode through the ball.",
        },
        {
            "id": "hitting_toe_tap",
            "title": "Toe tap timing move",
            "description": "Front foot doing a slight toe tap, timing the pitch",
            "prompt_context": "The athlete is using their timing mechanism, front foot doing a subtle toe tap as the pitcher delivers, keeping their rhythm and timing in sync with the pitch.",
        },
        {
            "id": "hitting_stride",
            "title": "Striding, hands back",
            "description": "Front foot striding toward pitcher, hands staying back",
            "prompt_context": "The athlete is mid-stride, front foot stepping toward the pitcher while keeping the hands back and the bat cocked, maintaining separation before exploding into the swing.",
        },
        {
            "id": "hitting_contact",
            "title": "Contact point, bat on ball",
            "description": "Bat meeting ball out front, hips fully rotated",
            "prompt_context": "The athlete is at the exact moment of contact, bat meeting the ball out in front of home plate, hips fully rotated, arms fully extended through the hitting zone.",
        },
        {
            "id": "hitting_follow_one_hand",
            "title": "Follow through, one hand off",
            "description": "One hand released from bat in the follow through",
            "prompt_context": "The athlete is in the follow through of the swing, top hand naturally releasing from the bat as the bottom hand extends fully, watching the ball travel after making contact.",
        },
        {
            "id": "hitting_full_follow",
            "title": "Full follow through, two hands",
            "description": "Bat fully wrapped around the body, complete swing",
            "prompt_context": "The athlete has completed a full two-handed follow through, the bat fully wrapped around the body behind them, weight fully transferred to the front foot, watching the ball.",
        },
        {
            "id": "hitting_check_swing",
            "title": "Check swing, holding back",
            "description": "Mid-swing, holding back, bat stopped partway",
            "prompt_context": "The athlete began their swing but is checking it, bat stopped partway through the swing zone, body holding back and not committing fully.",
        },
        {
            "id": "hitting_bunt",
            "title": "Bunt stance",
            "description": "Squared around to bunt, bat flat and out front",
            "prompt_context": "The athlete has squared around into the bunting stance, bat held flat and extended out in front of the plate, soft hands ready to deaden the ball.",
        },
        {
            "id": "hitting_walkoff",
            "title": "Walk-off bat drop moment",
            "description": "Knowing the ball is gone, beginning to drop the bat",
            "prompt_context": "The athlete has just made contact on what they know is a home run, beginning the dramatic bat drop as they watch the ball leave the park, pure confidence in the moment.",
        },
    ],
    "fielding": [
        {
            "id": "fielding_ready",
            "title": "Ready position, pre-pitch",
            "description": "Athletic stance, knees bent, glove low, weight on balls of feet",
            "prompt_context": "The athlete is in their athletic pre-pitch ready position, knees bent, glove held low and out in front, weight balanced on the balls of the feet, ready to react in any direction.",
        },
        {
            "id": "fielding_first_step",
            "title": "First explosive step, reacting",
            "description": "Just reacted to the ball, taking the first crossover step",
            "prompt_context": "The athlete has just picked up the ball off the bat and is taking their explosive first crossover step in reaction, body already moving toward where the ball is going.",
        },
        {
            "id": "fielding_backhand",
            "title": "Ranging to the backhand side",
            "description": "Moving to the backhand side, glove extended out",
            "prompt_context": "The athlete is ranging hard to their backhand side, body fully turned and running, glove extended out in front making a backhand play on a ball to their throwing arm side.",
        },
        {
            "id": "fielding_glove_side",
            "title": "Ranging to the glove side",
            "description": "Moving to the glove side, reaching out for the ball",
            "prompt_context": "The athlete is ranging to their glove side, body moving laterally with the glove reaching out to make a forehand play on a ball to their non-throwing arm side.",
        },
        {
            "id": "fielding_dive_airborne",
            "title": "Full dive, body airborne",
            "description": "Fully launched in the air, body horizontal, glove extended",
            "prompt_context": "The athlete is fully airborne in a dive, body horizontal to the ground, glove fully extended making or about to make a diving catch, completely laid out.",
        },
        {
            "id": "fielding_dive_landing",
            "title": "Just landed after diving",
            "description": "Just hit the ground after a dive, ball in glove, sliding",
            "prompt_context": "The athlete has just completed a dive and is sliding on the grass or dirt, ball secured in the glove after the diving catch, body still low to the ground.",
        },
        {
            "id": "fielding_wall_jump",
            "title": "Jumping at the wall, robbing",
            "description": "Leaping up at the wall, glove extended above to rob a homer",
            "prompt_context": "The athlete is leaping up at the outfield wall or fence, one foot possibly on the wall, glove fully extended above the top of the barrier to rob what would have been a home run.",
        },
        {
            "id": "fielding_going_back",
            "title": "Going back on a deep flyball",
            "description": "Turned and running back, glove up, tracking a deep ball",
            "prompt_context": "The athlete has turned their back and is running toward the warning track or fence, glove raised, tracking a deep flyball over their shoulder while running at full speed.",
        },
        {
            "id": "fielding_charging",
            "title": "Charging in on a sinking liner",
            "description": "Charging hard toward infield, glove down for a sinking liner",
            "prompt_context": "The athlete is charging aggressively toward the infield, running at full speed with the glove held low near the ground trying to make a shoestring catch on a sinking line drive.",
        },
        {
            "id": "fielding_double_play",
            "title": "Double play pivot at second",
            "description": "Catching throw at second, pivoting off the bag, firing to first",
            "prompt_context": "The athlete is at second base executing a double play pivot, catching the incoming throw, pivoting off the base to avoid the runner, and firing the relay throw to first base.",
        },
    ],
    "catching": [
        {
            "id": "catching_set",
            "title": "Set position, giving target",
            "description": "In full crouch, mitt extended and open, giving the pitcher a target",
            "prompt_context": "The athlete is in their full catching crouch behind home plate, mitt extended and open, giving the pitcher a clear target to throw to.",
        },
        {
            "id": "catching_receiving",
            "title": "Receiving a pitch",
            "description": "In the middle of receiving a pitch, mitt absorbing the ball",
            "prompt_context": "The athlete is in the process of receiving a pitch, mitt positioned to catch the ball, body still and controlled behind the plate.",
        },
        {
            "id": "catching_framing_low",
            "title": "Framing a low pitch",
            "description": "Receiving a pitch at the bottom of the zone, subtly framing up",
            "prompt_context": "The athlete is receiving a pitch at the bottom of the strike zone, using soft hands to subtly move the mitt upward to frame the pitch as a strike for the umpire.",
        },
        {
            "id": "catching_framing_outside",
            "title": "Framing an outside corner pitch",
            "description": "Catching a pitch on the outside corner, turning mitt inward",
            "prompt_context": "The athlete is receiving a pitch on the outside corner of the plate, mitt positioned wide and turning inward to frame the pitch as a strike.",
        },
        {
            "id": "catching_pop_throw_rising",
            "title": "Coming up for a pop throw",
            "description": "Rising out of the crouch, throwing arm coming up to fire",
            "prompt_context": "The athlete is rising quickly out of the catching crouch, transferring the ball from mitt to throwing hand, arm coming up and loading to make a throw to second base.",
        },
        {
            "id": "catching_pop_throw_release",
            "title": "Full pop throw, arm extended",
            "description": "Fully upright, throwing arm fully extended on the throw",
            "prompt_context": "The athlete is fully upright and has made the pop throw, throwing arm fully extended toward second base at the release point, body square and powerful.",
        },
        {
            "id": "catching_blocking",
            "title": "Blocking a ball in the dirt",
            "description": "Dropped to both knees blocking a wild pitch, chin down",
            "prompt_context": "The athlete has dropped to both knees to block a ball in the dirt, body square and low, chin tucked down to the chest, using their body as a wall to keep the ball in front.",
        },
        {
            "id": "catching_bunt_field",
            "title": "Fielding a bunt",
            "description": "Out from behind the plate, charging a bunt, about to throw",
            "prompt_context": "The athlete has come out from behind home plate charging a bunt, mask discarded, picking up the ball and loading to make a quick throw to the base.",
        },
    ],
    "celebrating": [
        {
            "id": "celebrating_first_fist_pump",
            "title": "First raw fist pump",
            "description": "Immediate reaction, single fist pump down, intense expression",
            "prompt_context": "The athlete is having their immediate raw celebratory reaction, a single powerful fist pump downward, jaw set and intense, pure competitive emotion in the moment.",
        },
        {
            "id": "celebrating_double_fist",
            "title": "Double fist pump, both hands",
            "description": "Both fists pumping down simultaneously, teeth clenched",
            "prompt_context": "The athlete is pumping both fists downward simultaneously in an explosive double celebration, teeth clenched, eyes intense, maximum competitive emotion.",
        },
        {
            "id": "celebrating_arms_raised",
            "title": "Arms raised, looking up",
            "description": "Both arms fully overhead, looking up to the sky",
            "prompt_context": "The athlete has both arms raised fully overhead reaching toward the sky, head tilted back looking upward, soaking in a significant moment of triumph.",
        },
        {
            "id": "celebrating_jump_pump",
            "title": "Jump and fist pump",
            "description": "Jumping off the ground while fist pumping, full body",
            "prompt_context": "The athlete is fully airborne, feet off the ground in a celebratory jump, fist pumping powerfully while in the air, full body expression of joy.",
        },
        {
            "id": "celebrating_pointing_dugout",
            "title": "Pointing to the dugout",
            "description": "Pointing toward teammates in the dugout after a big play",
            "prompt_context": "The athlete is pointing directly toward their teammates in the dugout, sharing the moment, acknowledging the team after making a significant play.",
        },
        {
            "id": "celebrating_screaming_sky",
            "title": "Screaming toward the sky",
            "description": "Head tilted back, mouth open in a yell, arms wide",
            "prompt_context": "The athlete has their head tilted fully back, mouth open in a raw scream of pure excitement and release, arms spread wide, every emotion pouring out.",
        },
        {
            "id": "celebrating_slow_trot",
            "title": "Slow home run trot, head down",
            "description": "Walking slowly from the plate, head down, letting it sink in",
            "prompt_context": "The athlete is taking slow deliberate steps away from home plate, head slightly down, letting the magnitude of the home run moment sink in before beginning the full trot around the bases.",
        },
        {
            "id": "celebrating_helmet_tip",
            "title": "Helmet tip during trot",
            "description": "Rounding a base, tipping the helmet to the crowd",
            "prompt_context": "The athlete is mid home run trot rounding one of the bases, reaching up to tip or touch the brim of their helmet in acknowledgment to the crowd.",
        },
        {
            "id": "celebrating_mob_arms_wide",
            "title": "Running toward teammate mob",
            "description": "Running toward rushing teammates, arms wide open",
            "prompt_context": "The athlete is running toward a group of teammates who are rushing in to celebrate, arms spread wide open ready to embrace the celebration mob.",
        },
        {
            "id": "celebrating_pointing_stands",
            "title": "Pointing to someone in the stands",
            "description": "After crossing the plate, pointing up to someone specific",
            "prompt_context": "The athlete has just crossed home plate and is looking up into the stands, pointing directly at a specific person — a parent, family member, or someone meaningful to them in that moment.",
        },
    ],
    "pumping_fist": [
        {
            "id": "fist_subtle_single",
            "title": "Single subtle fist pump",
            "description": "One controlled fist pump down, understated but intense",
            "prompt_context": "The athlete is performing a single controlled fist pump downward, understated and composed but clearly intense, eyes focused, the quiet confidence of a competitor.",
        },
        {
            "id": "fist_aggressive_double",
            "title": "Aggressive rapid double pump",
            "description": "Two rapid aggressive fist pumps, jaw clenched",
            "prompt_context": "The athlete is executing two rapid aggressive fist pumps in quick succession, jaw fully clenched, pure competitive fire and intensity in the motion.",
        },
        {
            "id": "fist_slow_deliberate",
            "title": "Slow deliberate powerful pump",
            "description": "One slow powerful fist pump, savoring the moment",
            "prompt_context": "The athlete is making one slow and deliberately powerful fist pump, savoring the moment fully, total composure and confidence in the controlled celebration.",
        },
        {
            "id": "fist_running",
            "title": "Fist pump while running",
            "description": "Pumping fist while jogging or running, mid-stride",
            "prompt_context": "The athlete is pumping their fist while in motion, jogging or running mid-stride, the celebration happening while still moving on the field.",
        },
        {
            "id": "fist_toward_dugout",
            "title": "Fist pump toward the dugout",
            "description": "Fist pump directed toward teammates in the dugout",
            "prompt_context": "The athlete is directing their fist pump toward the dugout, body turned toward their teammates, sharing the emotional moment with the bench.",
        },
        {
            "id": "fist_strikeout_spin",
            "title": "Strikeout spin and pump",
            "description": "Spinning and pumping fist after striking out a key batter",
            "prompt_context": "The athlete is spinning their body in a full rotation while simultaneously pumping the fist, the natural motion of a pitcher after getting a huge strikeout.",
        },
    ],
    "home_run_trot": [
        {
            "id": "trot_first_steps",
            "title": "Just left the box, first steps",
            "description": "Taking first slow confident steps out of the box, watching the ball",
            "prompt_context": "The athlete has just made contact and is taking their first slow confident steps out of the batter's box, head turning to watch the ball travel, the home run trot just beginning.",
        },
        {
            "id": "trot_rounding_first",
            "title": "Rounding first base",
            "description": "Making the wide turn around first base, settling into trot",
            "prompt_context": "The athlete is making the wide arcing turn around first base, settling into their home run trot pace, body relaxed and confident.",
        },
        {
            "id": "trot_between_bases",
            "title": "Mid-trot between bases",
            "description": "Fully locked into the trot, between bases",
            "prompt_context": "The athlete is fully locked into their home run trot between bases, pace measured and deliberate, fully present in the moment of the home run.",
        },
        {
            "id": "trot_rounding_third",
            "title": "Rounding third, home in sight",
            "description": "Making the turn at third, home plate in sight ahead",
            "prompt_context": "The athlete is making the final turn around third base, home plate now clearly in sight straight ahead, the end of the home run trot moments away.",
        },
        {
            "id": "trot_approaching_home",
            "title": "Approaching home plate",
            "description": "Last few steps toward home, teammates starting to gather",
            "prompt_context": "The athlete is in the final few steps of the home run trot approaching home plate, teammates beginning to gather and rush in from the dugout to celebrate.",
        },
        {
            "id": "trot_crossing_home",
            "title": "Crossing home plate",
            "description": "The exact moment of crossing home plate, hands slapping",
            "prompt_context": "The athlete is at the exact moment of crossing home plate to complete the home run, slapping hands with waiting teammates, the celebration fully beginning.",
        },
    ],
}

MOTION_SCENARIOS: dict[str, list[MotionScenario]] = {
    "pitch_windup": SCENARIO_GROUPS["pitching"],
    "throwing": SCENARIO_GROUPS["throwing"],
    "hit_homerun": SCENARIO_GROUPS["hitting"],
    "field_dive": SCENARIO_GROUPS["fielding"],
    "catch_framing_throw": SCENARIO_GROUPS["catching"],
    "celebrate_fist": SCENARIO_GROUPS["pumping_fist"],
    "celebrate_homerun_trot": SCENARIO_GROUPS["home_run_trot"],
    "celebrate_energy": SCENARIO_GROUPS["celebrating"],
}

_SCENARIO_BY_MOTION: dict[str, dict[str, MotionScenario]] = {
    motion_id: {s['id']: s for s in scenarios}
    for motion_id, scenarios in MOTION_SCENARIOS.items()
}


def get_scenario(motion_id: str, scenario_id: str | None) -> MotionScenario | None:
    """Return scenario for a motion, or None for generic / unknown ids."""
    key = (scenario_id or "").strip()
    if not key or key == "none":
        return None
    motion_key = (motion_id or "").strip()
    return _SCENARIO_BY_MOTION.get(motion_key, {}).get(key)


def list_scenarios_for_motion(motion_id: str) -> list[dict[str, str]]:
    """Public scenario list for API (no prompt_context)."""
    motion_key = (motion_id or "").strip()
    return [
        {"id": s["id"], "title": s["title"], "description": s["description"]}
        for s in MOTION_SCENARIOS.get(motion_key, [])
    ]


def motion_has_scenarios(motion_id: str) -> bool:
    return bool(MOTION_SCENARIOS.get((motion_id or "").strip()))
