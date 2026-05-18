/** Motion catalog — ids must match backend data/animation_motions.py */

export const ANIMATION_MOTION_LABELS = {
  pitch_windup: "Winding Up and Throwing",
  pitch_delivery: "Full Pitch Delivery",
  hit_homerun: "Powerful Home Run Swing",
  hit_stance: "Batting Stance and Follow Through",
  field_dive: "Diving Catch",
  field_sprint: "Sprinting to Field a Ball",
  celebrate_fist: "Pumping Fist in Celebration",
  celebrate_crowd: "Pointing to the Crowd",
  celebrate_run: "Running Full Speed",
  celebrate_energy: "Explosive Celebratory Moment",
};

export const ANIMATION_MOTION_CATEGORIES = [
  "Pitching",
  "Hitting",
  "Fielding",
  "Celebration",
  "General Athletic",
];

export function motionLabel(motionId) {
  if (!motionId) return "";
  return ANIMATION_MOTION_LABELS[motionId] || motionId.replace(/_/g, " ");
}

export function groupMotionsByCategory(motions) {
  const groups = {};
  for (const cat of ANIMATION_MOTION_CATEGORIES) {
    groups[cat] = [];
  }
  for (const m of motions || []) {
    const cat = m.category || "General Athletic";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(m);
  }
  return groups;
}
