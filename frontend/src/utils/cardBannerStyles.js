import { normalizeTierKey } from "./cardTemplate";
import { normalizeHighlightThemeKey } from "./highlightCardStyles";

const THEME_LABELS = {
  neon: "Neon",
  holographic: "Holographic",
  chrome: "Chrome",
  retro: "Retro",
  gold_edition: "Gold Edition",
  midnight: "Midnight",
  inferno: "Inferno",
  mvp: "MVP",
  diamond: "Diamond",
  hall_of_fame: "Hall of Fame",
  spring_training: "Spring Training",
  summer_slam: "Summer Slam",
  halloween: "Halloween",
  christmas: "Christmas",
  fourth_of_july: "Fourth of July",
  new_year: "New Year",
  rookie_of_the_year: "ROTY",
  captain: "Captain",
};

export function formatBannerEdition(editionNumber, printRun) {
  const e = Number(editionNumber) || 1;
  const p = Number(printRun) || 1;
  return `${e} of ${p}`;
}

export function themeDisplayLabel(theme) {
  const key = normalizeHighlightThemeKey(theme);
  if (key === "default") return "";
  if (THEME_LABELS[key]) return THEME_LABELS[key];
  const raw = String(theme || "").trim();
  if (!raw) return "";
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function tierPillLabel(tierKey) {
  if (tierKey === "legends") return "LEGENDS";
  if (tierKey === "allstar") return "★ ALL-STAR";
  return "ROOKIE";
}

export function truncateBannerPlayerName(name, max = 20) {
  const s = String(name || "").trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

/** Unified tier + theme banner classes for all card types */
export function getCardBannerStyles(tier, theme) {
  const tierKey = normalizeTierKey(tier);
  const themeKey = normalizeHighlightThemeKey(theme);

  return {
    tierKey,
    themeKey,
    bannerClass: [
      "card-banner",
      `card-banner--${tierKey}`,
      themeKey !== "default" ? `card-banner--theme-${themeKey}` : "",
    ]
      .filter(Boolean)
      .join(" "),
    nameClass: `card-banner__name card-banner__name--${tierKey}`,
    teamClass: `card-banner__team card-banner__team--${tierKey}`,
    statsClass: `card-banner__stats card-banner__stats--${tierKey}`,
    tierPillClass: `card-banner__tier-pill card-banner__tier-pill--${tierKey}`,
    tierPillLabel: tierPillLabel(tierKey),
    themeClass: [
      "card-banner__theme",
      themeKey !== "default" ? `card-banner__theme--${themeKey}` : "",
    ]
      .filter(Boolean)
      .join(" "),
    themeLabel: themeDisplayLabel(theme),
    editionClass: `card-banner__edition card-banner__edition--${tierKey}`,
  };
}
