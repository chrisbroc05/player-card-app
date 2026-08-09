/** Action categories for photo-to-motion matching (Studio animated flow). */

export const ACTION_CATEGORIES = [
  {
    id: "pitching",
    label: "Pitching",
    description: "Delivering a pitch from the mound",
    klingMotion: "pitch_windup",
  },
  {
    id: "throwing",
    label: "Throwing",
    description: "Throwing the ball from any position",
    klingMotion: "throwing",
  },
  {
    id: "fielding_ground",
    label: "Fielding a Ground Ball",
    description: "Getting ready for or fielding a ground ball in the infield",
    klingMotion: "field_dive",
  },
  {
    id: "fly_ball",
    label: "Catching a Fly Ball",
    description: "Tracking or catching a fly ball",
    klingMotion: "field_dive",
  },
  {
    id: "outfield",
    label: "Outfield",
    description: "Playing the outfield — fielding, throwing, or tracking",
    klingMotion: "throwing",
  },
  {
    id: "hitting",
    label: "Hitting",
    description: "At the plate — batting stance, swing, or follow through",
    klingMotion: "hit_homerun",
  },
  {
    id: "catching",
    label: "Catching (Catcher)",
    description: "Behind the plate — receiving, framing, blocking, or throwing",
    klingMotion: "catch_framing_throw",
  },
  {
    id: "celebrating",
    label: "Celebrating",
    description: "Celebrating a big moment — any celebration",
    klingMotion: "celebrate_fist",
  },
  {
    id: "general",
    label: "General / Practice",
    description: "Practice, warmup, dugout, or any other baseball moment",
    klingMotion: "celebrate_energy",
  },
];

export function getActionCategory(id) {
  return ACTION_CATEGORIES.find((c) => c.id === id) || null;
}

export function klingMotionForCategory(categoryId) {
  return getActionCategory(categoryId)?.klingMotion || null;
}

/** @deprecated All categories map to a single Kling motion — motion step is skipped. */
export function motionIdsForActionCategory(categoryId) {
  const motion = klingMotionForCategory(categoryId);
  return motion ? [motion] : [];
}

/** @deprecated Every category is single-motion now. */
export function isSingleMotionCategory(categoryId) {
  return Boolean(getActionCategory(categoryId));
}
