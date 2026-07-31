import React from "react";
import { normalizeHighlightThemeKey } from "../utils/highlightCardStyles";

const NO_ICON_THEMES = new Set(["default", "neon", "holographic", "chrome", "custom"]);

/**
 * Theme icon anchored to bottom-right of the card video / media area.
 * Used on highlight cards (all sizes) and static/animated detail views.
 */
export default function ThemeVideoIcon({ theme, themeKey: themeKeyProp, className = "" }) {
  const themeKey = themeKeyProp || normalizeHighlightThemeKey(theme);
  if (!themeKey || NO_ICON_THEMES.has(themeKey)) return null;

  let content = null;
  let extraClass = "";

  switch (themeKey) {
    case "mvp":
      content = "🏆";
      break;
    case "diamond":
      content = "💎";
      break;
    case "hall_of_fame":
      content = "HOF";
      extraClass = "card-video-area__theme-icon--hof";
      break;
    case "gold_edition":
      content = "⭐";
      break;
    case "rookie_of_the_year":
      content = "🌟";
      break;
    case "captain":
      content = "⚓";
      break;
    case "inferno":
      content = "🔥";
      break;
    case "midnight":
      content = "✦";
      extraClass = "card-video-area__theme-icon--midnight";
      break;
    case "retro":
      content = "📸";
      break;
    case "spring_training":
      content = "⚾";
      break;
    case "summer_slam":
      content = "☀️";
      break;
    case "halloween":
      content = "🎃";
      break;
    case "christmas":
      content = "⭐";
      break;
    case "fourth_of_july":
      content = "🎆";
      break;
    case "new_year":
      content = "🎊";
      break;
    default:
      return null;
  }

  return (
    <div
      className={`card-video-area__theme-icon ${extraClass} ${className}`.trim()}
      aria-hidden
    >
      {content}
    </div>
  );
}
