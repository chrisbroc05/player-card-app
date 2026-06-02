/** Action categories for photo-to-motion matching (Studio animated flow). */

export const ACTION_CATEGORIES = [
  {
    id: "pitching",
    label: "Pitching",
    icon: "⚾",
    motionIds: ["pitch_windup"],
  },
  {
    id: "hitting",
    label: "Hitting",
    icon: "🏏",
    motionIds: ["hit_homerun"],
  },
  {
    id: "fielding",
    label: "Fielding",
    icon: "🧤",
    motionIds: ["field_dive"],
  },
  {
    id: "catching",
    label: "Catching",
    icon: "🎯",
    motionIds: ["catch_framing_throw"],
  },
  {
    id: "celebrating",
    label: "Celebrating",
    icon: "🎉",
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
