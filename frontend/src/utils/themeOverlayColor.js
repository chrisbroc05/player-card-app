import { normalizeTierKey } from "./cardTemplate";
import { normalizeHighlightThemeKey } from "./highlightCardStyles";

const THEME_OVERLAY_COLORS = {
  mvp: "rgba(239, 159, 39, 0.18)",
  diamond: "rgba(133, 183, 235, 0.18)",
  hall_of_fame: "rgba(205, 127, 50, 0.18)",
  gold_edition: "rgba(255, 215, 0, 0.20)",
  rookie_of_the_year: "rgba(75, 138, 26, 0.15)",
  captain: "rgba(24, 95, 165, 0.18)",
  chrome: "rgba(180, 180, 200, 0.15)",
  inferno: "rgba(216, 90, 48, 0.22)",
  midnight: "rgba(6, 13, 26, 0.28)",
  retro: "rgba(160, 120, 60, 0.20)",
  spring_training: "rgba(100, 180, 80, 0.15)",
  summer_slam: "rgba(255, 180, 0, 0.15)",
  halloween: "rgba(200, 80, 0, 0.20)",
  christmas: "rgba(180, 20, 20, 0.15)",
  fourth_of_july: "rgba(20, 50, 180, 0.15)",
  new_year: "rgba(200, 180, 50, 0.18)",
};

const NEON_BY_TIER = {
  rookie: "rgba(75, 200, 50, 0.15)",
  allstar: "rgba(74, 158, 255, 0.15)",
  legends: "rgba(240, 192, 48, 0.15)",
};

const TIER_BACKGROUND = {
  rookie: "#0d200d",
  allstar: "#060d1a",
  legends: "#0d0900",
};

/** Parse rgba(...) and scale the alpha channel (e.g. 0.7 for grid thumbnails). */
export function scaleRgbaOpacity(rgba, scale) {
  if (!rgba || scale === 1) return rgba;
  const match = rgba.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/
  );
  if (!match) return rgba;
  const [, r, g, b, a = "1"] = match;
  const nextAlpha = Math.min(0.28, Number(a) * scale);
  return `rgba(${r}, ${g}, ${b}, ${nextAlpha})`;
}

export function getHighlightTierBackgroundColor(tier) {
  const tierKey = normalizeTierKey(tier);
  return TIER_BACKGROUND[tierKey] || TIER_BACKGROUND.rookie;
}

export function isHolographicTheme(theme) {
  return normalizeHighlightThemeKey(theme) === "holographic";
}

/**
 * CSS rgba tint for highlight video overlays.
 * @param {object} [options]
 * @param {number} [options.opacityScale=1] — use 0.7 for grid thumbnails
 */
export function getThemeOverlayColor(theme, tier, { opacityScale = 1 } = {}) {
  const themeKey = normalizeHighlightThemeKey(theme);

  if (themeKey === "holographic") {
    return null;
  }

  if (themeKey === "neon") {
    const tierKey = normalizeTierKey(tier);
    const color = NEON_BY_TIER[tierKey] || NEON_BY_TIER.rookie;
    return opacityScale === 1 ? color : scaleRgbaOpacity(color, opacityScale);
  }

  if (themeKey === "holographic") {
    return null;
  }

  const base = THEME_OVERLAY_COLORS[themeKey] ?? "rgba(0, 0, 0, 0)";
  if (base === "rgba(0, 0, 0, 0)" || opacityScale === 1) return base;
  return scaleRgbaOpacity(base, opacityScale);
}
