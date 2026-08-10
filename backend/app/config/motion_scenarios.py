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

_GLOVE_TO_HAND_TRANSFER = (
    "The throwing hand visibly reaches INTO the glove to grip the baseball — "
    "fingers wrapping around the ball as it sits in the glove, the throwing hand closing on the ball "
    "and physically extracting it from the glove in a clear distinct motion, elbow bending as the hand "
    "reaches in then extending as the ball is removed — before the arm begins loading to the throwing position."
)

_FLIP_GLOVE_TO_HAND_TRANSFER = (
    "The throwing hand reaches into the glove and grips the ball, smoothly removing it in one fluid motion "
    "directly into the underhand flip position — no full loading of the arm, just a smooth extraction "
    "directly into the short toss."
)


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
        "Cinematic slow motion sports video. The pitcher stands on the pitching rubber facing home plate in the wind-up position. Both hands come together at the belt, then separate as the lead leg swings back and up into a high controlled leg kick — knee at least at hip height. The stride leg drives powerfully off the rubber, hips opening first toward home plate, throwing arm going from glove-side to high cocked position behind the ear, arm slot at roughly 10-11 o'clock (overhand to three-quarter). Stride foot lands on the power line directly toward home plate, front knee slightly flexed to absorb the landing force. Hips rotate fully, then shoulders, then arm whips through in sequence — kinetic chain from legs through core to arm. Single baseball released at full arm extension toward home plate, wrist snapping downward, arm following through across the opposite knee, back leg swinging around and landing in fielding position, body square to home plate at finish over the next 5 seconds.",
    ),
    _s(
        "pitch_stretch",
        "Stretch position delivery",
        "In the stretch, holding runners, about to deliver to the plate",
        "Cinematic slow motion sports video. The pitcher stands on the rubber in the stretch position — feet roughly shoulder width apart, glove side foot on the rubber, throwing side foot in front parallel to the rubber. Hands come set at the belt, body pausing briefly. The delivery is compact and quick — a shorter leg kick or slide step, stride foot driving directly toward home plate, hips opening quickly, throwing arm coming from high cocked position to release in one fluid motion, single baseball released at full extension, arm following through across the body, back leg swinging around, finishing in balanced fielding position over the next 5 seconds.",
    ),
    _s(
        "pitch_leg_kick",
        "Mid leg kick",
        "Leg fully raised at peak of kick, arm loading behind the head",
        "Cinematic slow motion sports video. The pitcher is at the peak of their leg kick — lead knee raised at least to hip height, body balanced on the pivot foot which is turned parallel to the rubber. From this peak position, the stride leg drives forward and down toward home plate, the throwing arm coming down from the glove and breaking toward the cocked position behind the ear simultaneously. Stride foot lands with a heel-to-toe motion, front knee flexed, hips exploding open first then shoulders rotating hard, throwing arm whipping through at three-quarter arm slot, single baseball released at full arm extension, wrist snapping sharply, arm following through down and across the opposite knee over the next 5 seconds.",
    ),
    _s(
        "pitch_release",
        "Release point",
        "Arm fully extended at release, ball leaving the fingertips",
        "Cinematic slow motion sports video. The pitcher is at the exact moment of release — stride foot fully planted pointing toward home plate, front knee bent and bracing, hips fully rotated facing home plate, shoulders rotating with the throwing shoulder driving forward, throwing arm at full extension pointed directly toward home plate, fingers on top of a single baseball with wrist snapping sharply downward at release. From this release point the arm continues in a natural deceleration arc — elbow bending as the arm sweeps down and across toward the opposite knee, glove arm tucking into the side for balance, back leg swinging around and landing parallel to the mound, body finishing in a square athletic fielding position facing home plate over the next 5 seconds.",
    ),
    _s(
        "pitch_follow_through",
        "Follow through",
        "Arm sweeping across body after release, back leg swinging around",
        "Cinematic slow motion sports video. The pitcher has just released the ball — throwing arm is in the follow through, sweeping down and across the body toward the opposite knee. The back leg swings around naturally from the rubber, landing even with or slightly ahead of the stride foot, body finishing square to home plate in an athletic fielding position with weight balanced evenly. The throwing elbow bends naturally as the arm decelerates, glove arm tucked to the side for balance. Body settles into a ready fielding stance — knees bent, weight forward, hands coming together at the center of the body, eyes up looking toward the hitter over the next 5 seconds. No baseball shown — already released.",
    ),
]

_THROWING_SCENARIOS: list[MotionScenario] = [
    _s(
        "throw_catch_ready",
        "Playing catch, just caught",
        "Just caught the ball, transferring to throwing hand, setting feet to throw",
        "Cinematic slow motion sports video. The player has just caught the ball in their glove and is preparing to throw. "
        f"{_GLOVE_TO_HAND_TRANSFER} "
        "The throwing hand grips the baseball across the seams for a four-seam grip, both hands coming together briefly at the chest. The feet shuffle into throwing position — back foot (throwing side) under the hip, front foot (glove side) stepping directly toward the target. Weight loads onto the back foot as the throwing arm swings down and back, elbow rising to shoulder height, arm reaching the high cocked position behind the ear. Front foot steps firmly toward the target, front knee slightly flexed, hips opening first then shoulders rotating, throwing arm driving forward at three-quarter arm slot, single baseball released at full extension, arm following through naturally toward the target and decelerating across the body, weight transferring fully to the front foot at finish over the next 5 seconds.",
    ),
    _s(
        "throw_catch_mid",
        "Playing catch, mid throw",
        "Arm back and loaded, weight shifting forward, about to release",
        "Cinematic slow motion sports video. The player is mid-throw in a playing catch context — back foot planted under the throwing-side hip, front foot stepped firmly toward the catch partner, body weight transferring from back to front. Throwing arm is driving forward from the high cocked position behind the ear, elbow leading slightly, then forearm and wrist snapping through, single baseball releasing at full arm extension pointed toward the catch partner at roughly equal height — this is a relaxed playing catch throw, not a max effort throw. Arm decelerates naturally across the body after release, weight settled on the front foot, body balanced and relaxed at finish over the next 5 seconds.",
    ),
    _s(
        "throw_infield",
        "Infield throw across the diamond",
        "Planting and throwing across the infield to a base",
        "Cinematic slow motion sports video. This is an infield throw across the diamond — the player is an infielder throwing to a base, NOT a pitcher throwing to home plate. The player's body is facing toward their target base (first base, second base, or third). Feet are set in throwing position with the front foot pointing directly at the target base. The throwing motion is at a three-quarter arm slot (not straight overhand like a pitcher) — arm coming from behind the ear, elbow at shoulder height, forearm horizontal. Hips and shoulders rotate together toward the target base, throwing arm drives forward and releases a single baseball on a tight line toward the target base, wrist snapping firmly at release, arm following through toward the target base — NOT across toward home plate. Body compact and balanced, weight on front foot at finish, fielding-ready position over the next 5 seconds. This motion is SHORTER and QUICKER than a pitching delivery — compact athletic infield throw.",
    ),
    _s(
        "throw_outfield",
        "Outfield throw, arm loaded",
        "Crow hop position, arm fully back, ready to fire a long throw",
        "Cinematic slow motion sports video. The outfielder is completing a crow hop throw — a rhythmic two-step approach to maximize throwing distance. The crow hop involves a small hop landing on the throwing-side foot, then a long stride of the glove-side foot directly toward the target. At the stride landing the throwing arm is fully loaded behind the ear at high cocked position, glove arm pointing toward the target for balance. Front foot plants firmly, hips drive open first, shoulders rotate hard, throwing arm comes through at an overhand slot for maximum distance, single baseball released at full extension with a strong wrist snap, arm following through completely down and across toward the opposite knee, body finishing low with momentum carrying forward over the next 5 seconds.",
    ),
    _s(
        "throw_relay",
        "Relay throw",
        "Just received a relay, spinning quickly to redirect and fire",
        "Cinematic slow motion sports video. The player is executing a relay throw — they have just caught an incoming throw and must immediately redirect it to another base. The catch happens with the body turned toward the incoming throw, then the player pivots quickly — spinning on the balls of their feet, feet shuffling rapidly to face the new target, throwing arm loading simultaneously to the cocked position, front foot stepping toward the new target base, compact quick throwing motion at three-quarter arm slot, single baseball released on a line toward the relay target, arm following through toward the target, body stopping the rotation efficiently. The entire catch-pivot-throw motion is quick and continuous — minimum time between receiving and releasing over the next 5 seconds.",
    ),
]

_FIELDING_GROUND_SCENARIOS: list[MotionScenario] = [
    _s(
        "field_ready",
        "Ready stance, waiting for the pitch",
        "Athletic pre-pitch fielding stance, knees bent, glove low, weight balanced",
        f"Cinematic slow motion sports video. The infielder is in their pre-pitch ready position — feet slightly wider than shoulder width, knees bent at roughly 120 degrees, weight on the inside balls of both feet, back flat and angled forward at about 45 degrees, hands hanging relaxed in front of the body with the glove open and facing upward at knee height. As the pitch is delivered the infielder takes a small timing step — one or both feet leaving the ground briefly to get weight onto the balls of the feet. Then they react explosively to a ground ball — first step is a jab step or crossover toward the ball, staying low with quick choppy steps, glove dropping toward the ground as they approach the single baseball, fielding it out in front of the body at the midline, soft hands absorbing the ball with the glove, {_GLOVE_TO_HAND_TRANSFER} over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "field_forehand",
        "Forehand play, ball to glove side",
        "Moving to the glove side, glove extended out for a forehand play",
        f"Cinematic slow motion sports video. The infielder reacts to a ground ball hit to their glove side (the forehand side). They shuffle laterally with quick low steps — staying low, back flat, knees bent — moving to position themselves in front of or slightly to the throwing-side of the ball. As the single baseball arrives, the glove is held with the palm facing upward and outward, positioned at or just outside the glove-side foot, body low with the back flat. The ball is fielded at the proper hop in the glove with soft hands, {_GLOVE_TO_HAND_TRANSFER} Weight shifts to the throwing-side foot, upper body rotates toward the target, and the throw is made toward the target over the next 5 seconds. Body stays low throughout — athletic infield play. Only one baseball shown.",
    ),
    _s(
        "field_backhand",
        "Backhand play, ball to throwing side",
        "Moving to the backhand side, glove crossing over for a backhand play",
        f"Cinematic slow motion sports video. The infielder reacts to a ground ball hit to their throwing side (the backhand side). They take a quick crossover step with the glove-side foot moving across the body toward the throwing side, body turning to the backhand side, staying low with knees bent. The glove turns over so the palm faces downward and outward (backhand position), the back of the glove leading as they approach the single baseball. The glove reaches across the body to field the ball on the backhand — arm extended, glove low to the ground, wrist rolled over. After fielding, {_GLOVE_TO_HAND_TRANSFER} The back foot (throwing side) plants firmly to stop lateral momentum, upper body rotates hard toward the target, arm loads to throwing position, and a strong throw is made toward the target base over the next 5 seconds. Compact aggressive infield backhand play. Only one baseball shown.",
    ),
    _s(
        "field_charge",
        "Charging a slow roller",
        "Charging aggressively toward a slow roller, about to barehand or glove it",
        f"Cinematic slow motion sports video. The infielder charges aggressively toward a slowly rolling baseball at full controlled speed — not sprinting wildly but quick and decisive. Steps are short and choppy as they approach, staying balanced. On the final 1-2 steps before the ball, the body lowers significantly — bending deeply at the knees and waist, hand or glove reaching down toward ground level. The single baseball is scooped up in one fluid motion — either with the glove from the backhand or forehand position, or barehanded by the throwing hand if the ball is close enough. When fielded in the glove, {_GLOVE_TO_HAND_TRANSFER} The scoop happens while still moving forward, the feet never completely stopping. Immediately after the scoop, the throwing foot plants hard to redirect momentum, the body rotates toward the target, arm loads quickly to throwing position and fires a strong throw to the base all in one continuous aggressive motion over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "field_short_hop",
        "Short hop, ball right at them",
        "Set and ready, fielding a tough short hop right at their feet",
        f"Cinematic slow motion sports video. The infielder is set in a low athletic position with a single baseball approaching on a difficult short hop — a ball that bounces very close to the fielder's feet, giving minimal reaction time. The fielder positions their feet so the ball is aligned with the center of their body, both knees bent deeply, back flat. The glove is positioned below the hands level — open palm facing upward at ground level — letting the ball come to the glove rather than reaching for it aggressively. Soft hands are critical — the glove gives slightly backward on contact to absorb the awkward bounce cleanly. {_GLOVE_TO_HAND_TRANSFER} The body stays low, then rises while stepping toward the target and making the throw over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "field_double_play",
        "Double play pivot at second base",
        "At second base catching the throw, pivoting to fire to first",
        f"Cinematic slow motion sports video. The infielder at second base is catching an incoming throw and pivoting to complete a double play to first base. The fielder straddles the bag or has one foot on the corner of the bag as the single baseball arrives in their glove. {_GLOVE_TO_HAND_TRANSFER} Immediately upon catching, they execute a pivot — pushing off the bag with the bag-side foot and stepping away from the incoming runner (toward the outfield grass side) to avoid being taken out. As they step away, the throwing arm loads to cocked position, the front foot steps firmly toward first base, hips and shoulders rotate toward first base, and the throw fires on a tight line to first base at three-quarter arm slot. The entire catch-pivot-throw sequence is explosive and quick, the fielder moving efficiently away from the runner while still making an accurate throw to first base over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "field_2b_flip_to_ss",
        "2B flip/feed to SS at second base",
        "Second baseman flipping or tossing the ball to the shortstop covering second base to start a double play",
        f"Cinematic slow motion sports video. The second baseman has fielded a ground ball — {_FLIP_GLOVE_TO_HAND_TRANSFER} — and is making a short flip or underhand toss to the shortstop covering second base. If the ball was fielded close to second base: the second baseman uses a short compact underhand flip — elbow bent at roughly 90 degrees, wrist flicking the single baseball upward and toward second base with a soft accurate toss, the motion is a short pendulum swing of the forearm, releasing the ball at waist height on a gentle arc toward the shortstop's glove side. The footwork involves the fielder moving toward second base as they flip, momentum carrying them through the toss. If the ball was fielded further from second base: the second baseman uses a quick sidearm or three-quarter arm throw — feet shuffling quickly to face second base, arm coming through at a low sidearm slot to keep the throw flat and on a line, single baseball released firmly toward second base, arm following through toward the bag. The entire motion is quick and smooth — getting the ball to the shortstop as fast as possible to start the double play over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "field_ss_flip_to_2b",
        "SS flip/feed to 2B at second base",
        "Shortstop flipping or throwing to the second baseman covering second base to start a double play",
        f"Cinematic slow motion sports video. The shortstop has fielded a ground ball — {_FLIP_GLOVE_TO_HAND_TRANSFER} — and is making a feed to the second baseman covering second base. The shortstop's momentum from fielding is typically moving toward the first base side which helps redirect toward second base. If close to second base: the shortstop uses a short underhand flip — wrist and forearm flicking a single baseball upward on a soft arc toward second base, elbow bent, the motion a compact pendulum flick rather than a full throwing motion, ball released at waist height, gentle but accurate toss while moving laterally. If further from second base: a quick sidearm throw — feet planting toward second base, arm coming through at a sidearm slot below the shoulder, single baseball thrown on a flat line directly to the second baseman's glove, arm following through flat toward second. The shortstop's body is angled toward second base throughout, momentum helping redirect the throw, smooth and quick over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "field_3b_throw_to_2b",
        "3B throw to 2B at second base",
        "Third baseman throwing to the second baseman covering second base to start a double play",
        f"Cinematic slow motion sports video. The third baseman has fielded a ground ball. {_GLOVE_TO_HAND_TRANSFER} This is the longest of the double play feeds — requiring a strong accurate overhand or three-quarter throw. The third baseman plants their back foot (throwing side), front foot stepping firmly toward second base on the opposite side of the infield, body opening fully toward second base. Throwing arm loaded to high cocked position behind the ear, hips driving open first toward second base then shoulders rotating, arm coming through at three-quarter to overhand arm slot, single baseball released at full extension pointed toward second base on a firm accurate line throw, wrist snapping at release, arm following through toward second base and decelerating naturally across the body. This is a strong firm throw — not an underhand flip — covering roughly 60-70 feet across the infield over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "field_2b_pivot_to_first",
        "2B catches throw and turns double play to first",
        "Second baseman receiving the throw at second base and firing to first to complete the double play",
        f"Cinematic slow motion sports video. The second baseman is at second base receiving the incoming throw to turn a double play. The second baseman approaches second base from the first base side, catching the single baseball while their back foot touches the bag. {_GLOVE_TO_HAND_TRANSFER} As they catch, they simultaneously execute a pivot — pushing off the bag with the back foot and hopping to the right side (toward the outfield) to avoid the incoming runner. The pivot involves a small jump and body rotation, the second baseman landing with their body now facing first base. Throwing arm loads to cocked position during the pivot, front foot lands firmly toward first base, hips and shoulders rotate toward first, arm drives through at three-quarter slot, single baseball released on a tight line toward first base, arm following through toward first, body finishing balanced facing first base. The entire catch-pivot-throw is one explosive athletic sequence lasting about 1 second — fast and efficient over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "field_ss_pivot_to_first",
        "SS catches throw and turns double play to first",
        "Shortstop receiving the throw at second base and firing to first to complete the double play",
        f"Cinematic slow motion sports video. The shortstop is at second base receiving the incoming throw to turn a double play. The shortstop approaches second base from the third base side and catches the single baseball while dragging their foot across the bag or touching the corner. {_GLOVE_TO_HAND_TRANSFER} Unlike the second baseman pivot, the shortstop uses momentum — they are moving from the third base side toward first base which helps redirect their throw toward first. After catching, they plant the back foot firmly and step through toward first base with the front foot, body momentum naturally flowing toward first. Throwing arm loads quickly during the catch, coming to cocked position, hips and shoulders rotating toward first, arm driving through at three-quarter slot, single baseball released on a line to first, wrist snapping, arm following through toward first base. The shortstop may jump to avoid the runner — a small jump off the bag while throwing, landing after the throw releases. Explosive athletic sequence over the next 5 seconds. Only one baseball shown.",
    ),
]

_FLY_BALL_SCENARIOS: list[MotionScenario] = [
    _s(
        "fly_tracking_back",
        "Tracking ball going back on deep fly",
        "Turned and running back toward warning track, glove up, tracking deep",
        "Cinematic slow motion sports video. The outfielder has read the ball going over their head and turned their back to the infield — body fully turned, dropping step taken with the correct foot (glove side drops back for a ball to the glove side, throwing side drops back for a ball to that side). Running at full speed with proper outfield running form — head up, eyes tracking the ball over the shoulder, glove raised to about ear height and angled to where the ball will arrive, back foot driving powerfully, front foot reaching with each stride. As the single baseball approaches, the outfielder positions to catch it at or slightly above eye level, glove opening with palm facing the incoming ball, squeezing the ball firmly in the glove as it arrives, other hand coming over to secure it, momentum carrying them a step or two forward after the catch over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "fly_charging",
        "Charging in on a sinking liner",
        "Running hard toward infield, glove low for a sinking line drive",
        "Cinematic slow motion sports video. The outfielder has read a sinking line drive or dying quail and is charging hard toward the infield at full speed. Lean is forward, body driving hard, glove arm reaching out and down as they run, eyes locked on the descending single baseball. On the final 1-2 steps before the catch the outfielder makes a decision — diving full extension if they can get there, or sliding feet-first if diving is not possible. If diving: the body launches forward and low, one knee bending to push off, glove arm extending fully to the ground level or just above, catching the single baseball on a shoestring catch inches from the grass, body landing on the chest and sliding forward on the grass, rolling to show the ball secure in the glove. If sliding: feet slide forward, glove drops to just above ground level, ball caught at shoetop level. Over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "fly_making_catch",
        "Making the catch, glove raised",
        "Glove raised and open, ball arriving, about to make the catch",
        "Cinematic slow motion sports video. The outfielder has positioned themselves under a fly ball and is making the catch. Feet are set with the glove-side foot slightly back (drop step position), body balanced and still, eyes locked on the single baseball descending from above. The glove is raised to just above eye level or eye level height, positioned in the path of the ball with the palm facing outward toward the ball. As the baseball arrives, the glove opens fully to receive it, fingers pointing up or slightly back, the ball settling into the web of the glove. The bare hand comes over the top of the glove immediately after contact to secure the ball. The outfielder shows the catch by raising the glove slightly — clean confident catch. Weight is balanced, ready to pivot and throw if needed over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "fly_wall_catch",
        "Leaping wall catch, robbing a homer",
        "Jumping at the wall, glove extended above to rob a home run",
        "Cinematic slow motion sports video. The outfielder is tracking a deep fly ball toward the outfield wall and leaping to make a catch above the top of the wall. Running at full speed toward the warning track, the outfielder plants their throwing-side foot on or near the warning track to push off, or plants both feet and leaps straight up. One hand may reach out to brace against the wall for orientation while the other — the glove hand — extends fully above the top of the wall, reaching as high as possible. The single baseball arrives just above the wall and is caught in the extended glove at maximum reach, the outfielder falling back or landing after the leap, holding the glove up to show the ball has been caught. Body collides lightly with the padding of the wall, absorbing the impact, maintaining possession of the ball over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "fly_diving",
        "Diving catch, fully airborne",
        "Fully launched horizontal through the air, glove extended making catch",
        "Cinematic slow motion sports video. The outfielder has read a ball they can only reach by diving and launches into a full extension dive. The plant foot pushes off explosively, propelling the body forward and slightly off the ground, body becoming horizontal in the air — parallel to the grass. The glove arm extends fully forward at ground level, glove open with palm facing the incoming single baseball. The ball arrives in the outstretched glove at or very near ground level as the body is still airborne. The body lands chest-first on the grass, sliding forward on the chest and abdomen, momentum carrying forward on the ground. The glove hand stays locked and raised slightly off the ground to protect the ball, the other hand coming over to secure it. The outfielder rolls slightly or pushes up, raising the glove to show the ball is secure in the glove over the next 5 seconds. Only one baseball shown.",
    ),
]

_OUTFIELD_SCENARIOS: list[MotionScenario] = [
    _s(
        "out_ready",
        "Outfield ready stance",
        "In outfield ready position, hands on knees, watching the pitch",
        "Cinematic slow motion sports video. The outfielder is in their pre-pitch ready position — feet slightly wider than shoulder width, hands resting on bent knees or hanging loosely in front, weight forward on the balls of the feet, eyes forward tracking the pitcher and batter. As the pitch is thrown they take a small timing step — weight shifting forward onto the balls of the feet to prepare to explode in any direction. When the ball is hit, they take a quick decisive first step — a drop step back if the ball is going over their head, a crossover step forward if the ball is coming in, a lateral shuffle or crossover if the ball is to the side. The first step is explosive and committed over the next 5 seconds. No baseball shown yet.",
    ),
    _s(
        "out_ground_ball",
        "Outfield ground ball, charging",
        "Charging hard toward an outfield ground ball, glove down",
        f"Cinematic slow motion sports video. The outfielder charges hard toward an outfield ground ball — running at full speed but under control, not overrunning the ball. As they approach, they lower their body — bending at the knees and waist, glove dropping toward the ground in front of and slightly outside their glove-side foot. The single baseball is fielded with the glove open and slightly angled upward to scoop the ball from the ground, soft hands giving on contact. {_GLOVE_TO_HAND_TRANSFER} Both knees are bent deeply when fielding, body low. After fielding, the outfielder plants their throwing-side foot, executes a crow hop — a small hop to gather momentum — then fires toward the infield with a strong overhand throw over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "out_crow_hop",
        "Crow hop, loading to throw",
        "Mid crow hop, gathering momentum for a long outfield throw",
        "Cinematic slow motion sports video. The outfielder is executing a crow hop to maximize throwing distance and accuracy. The crow hop is a two-step rhythmic motion — the throwing-side foot hops forward and lands, immediately followed by a long stride of the glove-side foot directly toward the target. As the stride foot lands, the body is in perfect throwing position — back foot under the throwing hip, front foot pointing at the target, throwing arm at full cocked position behind the ear, glove arm pointing toward the target for balance, weight loaded on the back foot. From this coiled position, hips drive open first toward the target, shoulders rotate, throwing arm whips through at overhand slot, single baseball released at full extension with strong wrist snap toward the target, arm following through completely down and across toward the opposite knee, body finishing low with momentum carrying forward over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "out_sprint_back",
        "Full sprint going back on deep ball",
        "Turned fully, sprinting back toward warning track at full speed",
        "Cinematic slow motion sports video. The outfielder has taken a drop step and is sprinting at full speed toward the warning track with their back to the infield, tracking a deep fly ball. Running form is powerful — arms pumping hard, legs driving with full stride length, body leaning slightly forward. Head turns over the shoulder periodically to locate the ball — the head turn is natural, not forced. Glove is raised near shoulder height on the glove side, ready to reach up and catch. Eyes tracking the ball in the sky while running at full speed. The outfielder may be approaching the warning track — feet feeling for the dirt-to-grass transition over the next 5 seconds. No baseball shown yet.",
    ),
    _s(
        "out_throw_release",
        "Outfield throw at release point",
        "Arm fully extended at release of a long outfield throw",
        "Cinematic slow motion sports video. The outfielder is at the exact moment of releasing a throw toward the infield. Back foot planted firmly under the throwing-side hip, front foot fully planted pointing toward the target, front knee slightly bent and bracing. Hips are fully open toward the target, shoulders rotating hard toward the target, throwing arm at full extension pointed toward the infield target — arm slot is overhand for maximum distance and accuracy on outfield throws. Single baseball at the fingertips with the wrist snapping sharply downward at the release point. From release, the arm continues in a full follow through — sweeping all the way down across toward the opposite knee, body lowering toward the ground with the momentum of the throw, back leg swinging around naturally, body decelerating over the next 5 seconds. Only one baseball shown.",
    ),
]

_HITTING_SCENARIOS: list[MotionScenario] = [
    _s(
        "hit_stance",
        "Batting stance, ready for the pitch",
        "In full batting stance, bat up, eyes on pitcher, weight balanced and ready",
        "Cinematic slow motion sports video. The batter is in their batting stance in the batter's box. Feet slightly wider than shoulder width, knees slightly bent, weight centered or slightly back on the back foot. Hands held at roughly shoulder height on the throwing-side of the body, bat angled back at roughly 45 degrees from vertical. Eyes forward tracking the pitcher. As the pitch is delivered, the batter initiates their timing mechanism — a small stride or leg kick with the front foot, or a toe tap, weight shifting slightly back loading onto the back foot, hands drifting slightly back simultaneously. A single baseball approaches the plate area, the batter begins their swing — front foot striding toward the pitcher landing open or closed depending on their style, hips beginning to open, hands starting forward over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "hit_loading",
        "Loading, weight shifted back",
        "Weight fully shifted to back foot, hands back, coiled and ready to fire",
        "Cinematic slow motion sports video. The batter has completed their load — weight fully back on the rear foot, front foot just completing its stride and landing, hands back at their launch position at shoulder height on the throwing side. From this fully loaded position, the swing explodes forward. Front foot plants firmly, then hips fire first — rotating hard open toward the pitcher — immediately followed by the hands and bat coming forward. The bat barrel stays back briefly (lag) as the hips rotate, then the wrists unhinge, bat barrel whipping through the contact zone, making contact with a single baseball out in front of the plate, arms extending fully through contact, bat following through up and around toward the back shoulder over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "hit_mid_swing",
        "Mid swing, driving through contact",
        "Hips fully rotating, hands driving through the hitting zone",
        "Cinematic slow motion sports video. The batter is in the middle of their swing — hips fully rotating toward the pitcher, front leg braced and straightening, back knee dropping toward the ground as the back hip drives through, hands driving the bat barrel through the hitting zone. The bat is approaching or at contact with a single baseball — bat barrel traveling on a slight downward to level path through the zone, hands inside the ball, arms beginning to extend. The wrists are firm at contact, body weight transferring from back foot to front foot through the swing, eyes on the contact point. Bat continues through contact with arms extending fully, then continuing into the follow through over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "hit_contact",
        "Contact point, bat on ball",
        "Bat meeting ball out front, hips rotated, arms extending through",
        "Cinematic slow motion sports video. The batter is at the exact moment of contact — bat barrel meeting a single baseball in the hitting zone out in front of the plate. Arms are nearly fully extended, hips fully rotated open toward the pitcher, front leg fully braced and straight, back knee dropped toward the ground. Both hands are on the bat, wrists firm and level at contact, bat barrel perfectly perpendicular to the path of the ball creating maximum contact surface. After contact, the baseball travels away (line drive or fly ball trajectory), the bat continues through contact — arms extending completely, wrists rolling over naturally, bat continuing up and around toward the back shoulder in the complete follow through, back foot pivoting to allow full hip rotation, head staying down at the contact point over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "hit_follow_through",
        "Full follow through",
        "Bat fully wrapped around the body, weight transferred, watching the ball",
        "Cinematic slow motion sports video. The batter has completed their swing through contact and is in the full follow through position. The bat is wrapped around the back shoulder or finishing high over the back shoulder, arms fully extended then naturally bending to accommodate the wrap-around. Hips are fully rotated facing the pitcher, front leg fully braced, back foot pivoted forward on the toes as the back hip drove through. Head is still down at the contact point, eyes looking at where the ball was. The batter holds the follow through briefly — admiring the ball with a confident finish — then the head comes up to watch the single baseball travel. Weight is fully on the front foot, body balanced in a tall finish position, back foot either pivoted or slightly raised over the next 5 seconds. Only one baseball shown traveling away.",
    ),
    _s(
        "hit_bunt",
        "Bunt stance",
        "Squared around to bunt, bat flat and extended out in front",
        "Cinematic slow motion sports video. The batter squares around to bunt — pivoting both feet to face the pitcher, or using a pivot bunt technique where only the front foot pivots open. The bat is held horizontally and extended out in front of the body at roughly belt to chest height, both hands gripping the bat loosely — top hand pinching the barrel between the thumb and bent index finger (not a full grip), bottom hand holding the handle. Arms are slightly bent and relaxed, not locked out. Eyes tracking a single baseball as it approaches. The bat meets the ball with deadened contact — not swinging but absorbing, the bat giving slightly backward on contact to deaden the ball. The single baseball drops softly onto the infield grass or dirt, the batter immediately dropping the bat and beginning to run toward first base over the next 5 seconds. Only one baseball shown.",
    ),
]

_CATCHING_SCENARIOS: list[MotionScenario] = [
    _s(
        "catch_set",
        "Set position, giving the target",
        "In full crouch, mitt extended and open, giving the pitcher a target",
        "Cinematic slow motion sports video. The catcher is in their primary receiving position behind home plate — in a low athletic crouch with feet roughly shoulder width apart and slightly wider, toes pointing outward, thighs roughly parallel to the ground, back straight and upright. The mitt is extended out in front of and slightly below the catcher's body, elbow resting on or just inside the right knee (for a right-handed thrower), mitt open and facing the pitcher as a clear target. The throwing hand is protected behind the back, or loosely fisted behind the mitt. As the pitch is delivered, the catcher stays still and quiet — no movement until the single baseball arrives. The ball arrives in the mitt with a soft catch, the mitt framing toward the center of the strike zone subtly after receiving over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "catch_receiving",
        "Receiving a pitch",
        "Catching a pitch, mitt absorbing the ball, body still",
        "Cinematic slow motion sports video. The catcher is in their receiving crouch, mitt positioned where the pitch is heading — either in the strike zone or just outside. The single baseball arrives from the pitcher and enters the mitt — the catcher uses soft hands, allowing the mitt to give slightly backward ('catch and give') rather than stabbing at the ball. The catch is clean and quiet, the mitt absorbing the velocity. Immediately after receiving, the catcher stabilizes the mitt in the catching position — holding it still for the umpire rather than pulling it immediately. If the pitch is on the edge of the zone, a subtle framing motion follows — a very slight rotation or pull of the wrist to present the ball as being in the strike zone. The throwing hand comes over the mitt to secure the ball over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "catch_framing",
        "Framing a pitch",
        "Subtly moving the mitt to frame a pitch as a strike",
        "Cinematic slow motion sports video. The catcher is receiving a pitch on the edge of the strike zone and using framing technique to get the strike call. The mitt is positioned at the edge of the zone where the pitch is arriving — outside corner, low edge, or inside corner. As the single baseball arrives, the catch is soft and quiet, the mitt receiving the ball without stabbing. Immediately after catching, the framing motion begins — a very subtle, smooth rotation of the wrist moving the mitt inward toward the center of the strike zone. The motion is small (2-4 inches maximum) and controlled — not a dramatic pull that draws attention. The mitt stops in the framed position and holds there, presenting the ball to the umpire, the catcher staying completely still in their crouch for a beat to allow the umpire to make the call over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "catch_pop_throw",
        "Pop throw to second base",
        "Rising out of crouch, arm loading to fire a throw to second",
        f"Cinematic slow motion sports video. The catcher has just received a pitch and is making a pop throw to second base to throw out a baserunner. The sequence is: catch → transfer → rise → throw. As the single baseball hits the mitt, {_GLOVE_TO_HAND_TRANSFER} The feet begin moving immediately — the throwing-side foot steps back slightly, the glove-side foot steps toward second base. The catcher rises explosively from the crouch by driving through both legs, the throwing arm loading to cocked position (elbow at shoulder height, forearm vertical) as the body rises and rotates toward second. Front foot (glove side) plants firmly pointing toward second base, hips driving open toward second, throwing arm firing through at three-quarter to overhand slot directly toward second base, single baseball released at full extension on a line toward second, strong wrist snap, arm following through toward second base. The entire catch-to-release is under 2 seconds — quick and powerful over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "catch_blocking",
        "Blocking a ball in the dirt",
        "Dropped to both knees blocking a wild pitch, body square and low",
        "Cinematic slow motion sports video. The catcher reads an incoming pitch that is headed into the dirt and immediately executes a block. The hands move the mitt downward toward the dirt in front of the body, both knees drop simultaneously to the ground — the knees landing roughly in line with the edges of home plate to form a wall. The body leans forward with the back rounded — creating a curved ramp that deflects the single baseball downward toward the catcher's feet rather than away. The chin tucks down, the throwing hand goes behind the back or fists up behind the mitt for protection. The single baseball hits the chest protector or mitt and deflects down to the ground directly in front of the catcher. The catcher immediately searches for the ball — popping up from the blocking position, scanning the ground, pouncing on the baseball to secure it and prevent the runner from advancing over the next 5 seconds. Only one baseball shown.",
    ),
    _s(
        "catch_bunt",
        "Fielding a bunt",
        "Out from behind the plate charging a bunt, about to pick it up",
        f"Cinematic slow motion sports video. The catcher reads a bunt from the batter and explodes out from behind home plate. The mask is ripped off immediately — the throwing hand grabs the mask and flings it to the side away from the field of play in one motion while the legs are already driving forward. The catcher charges hard toward where the single baseball has been bunted — either up the first base line, third base line, or directly in front of the plate. Reaching the ball, the catcher either uses the glove to scoop it or barehand picks it up — bending deeply with a flat back to get down to the ball at ground level. When fielded in the glove, {_GLOVE_TO_HAND_TRANSFER} When barehanded, the ball is already secured in the throwing hand. The throwing foot plants hard to stop the forward momentum, the body rotates to face the target base, and a quick strong throw fires to the base — sidearm or three-quarter depending on the angle and distance. Explosive and quick over the next 5 seconds. Only one baseball shown.",
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
