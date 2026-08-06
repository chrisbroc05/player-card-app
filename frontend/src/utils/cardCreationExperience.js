export const TIER_EXPERIENCE = {
  rookie: {
    key: "rookie",
    label: "Rookie",
    color: "#3B6D11",
    colorMuted: "rgba(59, 109, 17, 0.65)",
    font: '"Barlow Condensed", sans-serif',
    pill: "ROOKIE",
  },
  all_star: {
    key: "all_star",
    label: "All-Star",
    color: "#185FA5",
    colorMuted: "rgba(24, 95, 165, 0.65)",
    font: '"Rajdhani", sans-serif',
    pill: "★ ALL-STAR",
  },
  legends: {
    key: "legends",
    label: "Legends",
    color: "#BA7517",
    colorMuted: "rgba(186, 117, 23, 0.65)",
    font: '"Cinzel", serif',
    pill: "LEGENDS",
  },
};

export function normalizeExperienceTier(tier) {
  const t = String(tier || "rookie").toLowerCase().replace(/-/g, "_");
  if (t === "legends" || t === "legendary") return TIER_EXPERIENCE.legends;
  if (t === "all_star" || t === "allstar" || t === "rare") return TIER_EXPERIENCE.all_star;
  return TIER_EXPERIENCE.rookie;
}

export function themeDisplayName(theme) {
  const raw = String(theme || "").trim();
  if (!raw || raw === "Default (no theme)" || raw.toLowerCase() === "default") return "Premium";
  return raw;
}

export const FORGE_PHASE_TEXT = (theme, tierLabel) => [
  "Forging your card...",
  `Adding ${theme} effects...`,
  "Rendering your player...",
  `Applying ${tierLabel} finish...`,
  "Almost ready...",
  "Your card is ready!",
];

export const REEL_PHASE_TEXT = [
  "",
  "Loading your highlight...",
  "Your highlight is ready to drop...",
  "Lights. Camera. Card.",
];

export const AWAKENING_CYCLE_TEXT = [
  "Something special is coming...",
  "AI is animating your player...",
  "Generating cinematic motion...",
  "Bringing your card to life...",
];

export const AWAKENING_FLIP_TEXT = "Your animated card is alive!";
