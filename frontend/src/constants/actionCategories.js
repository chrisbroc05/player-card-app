/** Action categories for photo-to-motion matching (Studio animated flow). */

export const ACTION_CATEGORIES = [
  {
    id: "pitching",
    label: "Pitching",
    description: "Pitching from the mound — full wind-up or stretch delivery",
    motionIds: ["pitch_windup"],
  },
  {
    id: "throwing",
    label: "Throwing",
    description: "Throwing from the field — infield, outfield, or any position player throw",
    motionIds: ["throwing"],
  },
  {
    id: "hitting",
    label: "Hitting",
    motionIds: ["hit_homerun"],
  },
  {
    id: "fielding",
    label: "Fielding",
    motionIds: ["field_dive"],
  },
  {
    id: "catching",
    label: "Catching",
    motionIds: ["catch_framing_throw"],
  },
  {
    id: "celebrating",
    label: "Celebrating",
    motionIds: ["celebrate_fist", "celebrate_energy", "celebrate_homerun_trot"],
  },
];

export function getActionCategory(id) {
  return ACTION_CATEGORIES.find((c) => c.id === id) || null;
}

export function motionIdsForActionCategory(categoryId) {
  return getActionCategory(categoryId)?.motionIds || [];
}

export function isSingleMotionCategory(categoryId) {
  return motionIdsForActionCategory(categoryId).length === 1;
}
