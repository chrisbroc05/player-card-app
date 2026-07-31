import { normalizeTierKey } from "./cardTemplate";

const KNOWN_THEME_KEYS = new Set([
  "neon",
  "holographic",
  "chrome",
  "retro",
  "gold_edition",
  "midnight",
  "inferno",
  "mvp",
  "diamond",
  "hall_of_fame",
  "spring_training",
  "summer_slam",
  "halloween",
  "christmas",
  "fourth_of_july",
  "new_year",
  "rookie_of_the_year",
  "captain",
]);

/** Normalize theme id/slug to a highlight style modifier key */
export function normalizeHighlightThemeKey(theme) {
  const raw = String(theme || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (!raw || raw === "none" || raw === "default") return "default";
  if (KNOWN_THEME_KEYS.has(raw)) return raw;
  if (raw.includes("neon")) return "neon";
  if (raw.includes("holo")) return "holographic";
  if (raw.includes("chrome") || raw.includes("metallic")) return "chrome";
  if (raw.includes("retro") || raw.includes("vintage") || raw.includes("classic")) return "retro";
  if (raw.includes("gold")) return "gold_edition";
  if (raw.includes("midnight")) return "midnight";
  if (raw.includes("inferno")) return "inferno";
  if (raw.includes("mvp")) return "mvp";
  if (raw.includes("diamond")) return "diamond";
  if (raw.includes("hall_of_fame") || raw === "hof") return "hall_of_fame";
  if (raw.includes("spring")) return "spring_training";
  if (raw.includes("summer")) return "summer_slam";
  if (raw.includes("halloween")) return "halloween";
  if (raw.includes("christmas")) return "christmas";
  if (raw.includes("fourth") || raw.includes("july")) return "fourth_of_july";
  if (raw.includes("new_year")) return "new_year";
  if (raw.includes("rookie_of_the_year")) return "rookie_of_the_year";
  if (raw.includes("captain")) return "captain";
  return "custom";
}

/** Human-readable theme label for banner (custom / unnamed themes) */
export function highlightThemeBannerLabel(theme) {
  const key = normalizeHighlightThemeKey(theme);
  if (key !== "custom") return "";
  const raw = String(theme || "").trim();
  if (!raw) return "";
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function highlightTierBadgeLabel(tierKey) {
  if (tierKey === "legends") return "LEGENDS";
  if (tierKey === "allstar") return "★ ALL-STAR ★";
  return "ROOKIE";
}

function highlightThemeBadge(themeKey) {
  switch (themeKey) {
    case "mvp":
      return { label: "🏆 MVP", className: "highlight-card__theme-badge highlight-card__theme-badge--mvp" };
    case "hall_of_fame":
      return { label: "HOF", className: "highlight-card__theme-badge highlight-card__theme-badge--hof" };
    case "diamond":
      return { label: "◆", className: "highlight-card__theme-badge highlight-card__theme-badge--diamond" };
    default:
      return null;
  }
}

const ROOKIE_HIGHLIGHT_DEFAULTS = {
  tierKey: "rookie",
  themeKey: "default",
  frameClass: "highlight-card highlight-card--rookie",
  bannerClass: "highlight-card__banner highlight-card__banner--rookie",
  mediaClass: "highlight-card__media highlight-card__media--rookie",
  tierBadgeLabel: "ROOKIE",
  tierBadgeClass: "highlight-card__tier-badge highlight-card__tier-badge--rookie",
  playerNameClass: "highlight-card__player-name highlight-card__player-name--rookie",
  themeBadge: null,
  themeBannerLabel: "",
};

/**
 * CSS-only tier + theme classes for highlight cards.
 * Video area stays clean — border, banner, and rim light only.
 */
export function getHighlightCardStyles(tier, theme) {
  try {
    const tierKey = normalizeTierKey(tier);
    const themeKey = normalizeHighlightThemeKey(theme);

    const frameClass = [
      "highlight-card",
      `highlight-card--${tierKey}`,
      themeKey !== "default" ? `highlight-card--theme-${themeKey}` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const bannerClass = [
      "highlight-card__banner",
      `highlight-card__banner--${tierKey}`,
      themeKey !== "default" ? `highlight-card__banner--theme-${themeKey}` : "",
    ]
      .filter(Boolean)
      .join(" ");

    return {
      tierKey,
      themeKey,
      frameClass,
      bannerClass,
      mediaClass: `highlight-card__media highlight-card__media--${tierKey}`,
      tierBadgeLabel: highlightTierBadgeLabel(tierKey),
      tierBadgeClass: `highlight-card__tier-badge highlight-card__tier-badge--${tierKey}`,
      playerNameClass: `highlight-card__player-name highlight-card__player-name--${tierKey}`,
      themeBadge: highlightThemeBadge(themeKey),
      themeBannerLabel: highlightThemeBannerLabel(theme),
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[getHighlightCardStyles] fallback to rookie styling", err);
    return { ...ROOKIE_HIGHLIGHT_DEFAULTS };
  }
}
