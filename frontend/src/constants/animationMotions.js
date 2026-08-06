/** Motion catalog — ids and labels must match backend data/animation_motions.py */

export const ANIMATION_MOTION_LABELS = {
  pitch_windup: "Winding Up and Throwing",
  throwing: "Throwing",
  pitch_delivery: "Full Pitch Delivery",
  pitch_strikeout_roar: "Strikeout Roar",
  hit_homerun: "Powerful Home Run Swing",
  hit_stance: "Batting Stance and Follow Through",
  hit_walkup: "Walk-Up Swagger",
  hit_bat_flip: "Bat Flip",
  field_dive: "Diving Catch",
  field_dive_celebrate: "Diving Catch Celebration",
  field_sprint: "Sprinting to Field a Ball",
  catch_framing_throw: "Catcher Framing and Pop Throw",
  celebrate_homerun_trot: "Home Run Trot",
  celebrate_crowd: "Pointing to the Crowd",
  celebrate_fist: "Pumping Fist",
  celebrate_energy: "Explosive Celebratory Moment",
  celebrate_run: "Running Full Speed",
};

/** Display order for motion picker group headers (selectable motions only). */
export const ANIMATION_MOTION_CATEGORIES = [
  "Pitching",
  "Throwing",
  "Hitting",
  "Fielding",
  "Catching",
  "Celebration",
];

export function motionLabel(motionId) {
  if (motionId == null || motionId === "") return "";
  const key = String(motionId);
  return ANIMATION_MOTION_LABELS[key] || key.replace(/_/g, " ");
}

export function groupMotionsByCategory(motions) {
  const groups = {};
  for (const m of motions || []) {
    const cat = m.category || "Celebration";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(m);
  }
  return groups;
}

export function motionCategoryOrder(motions) {
  const groups = groupMotionsByCategory(motions);
  const ordered = ANIMATION_MOTION_CATEGORIES.filter((cat) => (groups[cat] || []).length > 0);
  const extras = Object.keys(groups).filter((cat) => !ordered.includes(cat));
  return [...ordered, ...extras];
}
