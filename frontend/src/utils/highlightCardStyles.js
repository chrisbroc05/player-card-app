import { normalizeTierKey } from "./cardTemplate";

/** Normalize theme id/slug to a highlight style modifier key */
export function normalizeHighlightThemeKey(theme) {
  const raw = String(theme || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (!raw || raw === "none" || raw === "default") return "default";
  if (raw.includes("neon")) return "neon";
  if (raw.includes("holo")) return "holographic";
  if (raw.includes("chrome") || raw.includes("metallic")) return "chrome";
  if (raw.includes("retro") || raw.includes("vintage") || raw.includes("classic")) return "retro";
  if (raw.includes("gold")) return "gold_edition";
  if (raw.includes("midnight")) return "midnight";
  if (raw.includes("inferno")) return "inferno";
  return "default";
}

/** Human-readable theme label for banner (default themes only) */
export function highlightThemeBannerLabel(theme) {
  const key = normalizeHighlightThemeKey(theme);
  if (key !== "default") return "";
  const raw = String(theme || "").trim();
  if (!raw) return "";
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * CSS-only tier + theme classes for highlight cards.
 * Video area stays clean — border, banner, and rim light only.
 */
export function getHighlightCardStyles(tier, theme) {
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
    mediaClass: "highlight-card__media",
    themeBannerLabel: highlightThemeBannerLabel(theme),
  };
}
