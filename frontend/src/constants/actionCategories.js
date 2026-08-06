/** Action categories for photo-to-motion matching (Studio animated flow). */

export const ACTION_CATEGORIES = [
  {
    id: "pitching",
    label: "Pitching",
    description: "Full wind-up or stretch delivery from the mound",
    motionIds: ["pitch_windup"],
  },
  {
    id: "throwing",
    label: "Throwing",
    description: "Field throw from any position — infield or outfield",
    motionIds: ["throwing"],
  },
  {
    id: "hitting",
    label: "Hitting",
    description: "Batting stance, swing, or follow through",
    motionIds: ["hit_homerun"],
  },
  {
    id: "fielding",
    label: "Fielding",
    description: "Diving, ranging, or making a play in the field",
    motionIds: ["field_dive"],
  },
  {
    id: "catching",
    label: "Catching",
    description: "Behind the plate — receiving, framing, or throwing",
    motionIds: ["catch_framing_throw"],
  },
  {
    id: "celebrating",
    label: "Celebrating",
    description: "Fist pump, trot, arms up — any celebration moment",
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
