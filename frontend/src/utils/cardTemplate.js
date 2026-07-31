import { vaultTierBadge } from "./tierStyles";
import { formatBannerEdition } from "./cardBannerStyles";

/** Standard trading card aspect ratio 2.5 × 3.5 */
export const CARD_ASPECT_CLASS = "aspect-[5/7]";

export function normalizeTierKey(tier) {
  const t = String(tier || "rookie").toLowerCase().replace(/-/g, "_");
  if (t === "legends" || t === "legendary") return "legends";
  if (t === "allstar" || t === "all_star" || t === "rare") return "allstar";
  return "rookie";
}

export function tierFrameStyles(tier) {
  const key = normalizeTierKey(tier);
  if (key === "legends") {
    return {
      key,
      borderClass: "border-[3px] border-[#BA7517]",
      glowClass: "shadow-[0_0_28px_rgba(186,117,23,0.45)] card-tier-legends-shimmer",
      bgClass: "bg-gradient-to-b from-[#2a1f0a]/95 via-[#14120c] to-[#0a0908]",
      bannerClass: "from-[#1a1408] via-[#12100a] to-[#0c0b08]",
      accentClass: "border-[#BA7517]/40",
    };
  }
  if (key === "allstar") {
    return {
      key,
      borderClass: "border-2 border-[#185FA5]",
      glowClass: "shadow-[0_0_24px_rgba(24,95,165,0.4)]",
      bgClass: "bg-gradient-to-b from-[#0c1a2e]/95 via-[#0a1018] to-[#06080c]",
      bannerClass: "from-[#0a1628] via-[#081018] to-[#060a10]",
      accentClass: "border-[#185FA5]/40",
    };
  }
  return {
    key,
    borderClass: "border-2 border-[#3B6D11]",
    glowClass: "shadow-[0_0_22px_rgba(59,109,17,0.38)]",
    bgClass: "bg-gradient-to-b from-[#0f1a0c]/95 via-[#0a1208] to-[#060806]",
    bannerClass: "from-[#0c160a] via-[#081008] to-[#060806]",
    accentClass: "border-[#3B6D11]/40",
  };
}

export function themeOverlayClass(theme) {
  const t = String(theme || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");
  if (!t || t === "none") return "";
  if (t.includes("neon")) return "card-theme-overlay card-theme-neon";
  if (t.includes("holo")) return "card-theme-overlay card-theme-holographic";
  if (t.includes("chrome") || t.includes("metallic")) return "card-theme-overlay card-theme-chrome";
  if (t.includes("retro") || t.includes("vintage") || t.includes("classic")) return "card-theme-overlay card-theme-retro";
  return "card-theme-overlay card-theme-subtle";
}

export function resolveCardDisplayMeta(card) {
  if (!card || typeof card !== "object") return null;

  const playerName = (card.player_name || card.playerName || "").trim();
  if (!playerName) return null;

  const team = (card.team_name || card.teamName || "").trim();
  const position = (card.position || "").trim();
  const jersey = (card.jersey_number ?? card.jerseyNumber ?? "").toString().trim();
  const gradYear = (card.grad_year ?? card.gradYear ?? "").toString().trim();
  const tier = card.tier || "rookie";
  const theme = card.theme || card.special_theme || card.specialTheme || "";
  const edition = formatBannerEdition(card.edition_number, card.print_run);
  const badge = vaultTierBadge(tier);

  const statsLine = [
    position || null,
    jersey ? `#${jersey.replace(/^#/, "")}` : null,
    gradYear || null,
  ]
    .filter(Boolean)
    .join(" | ");

  return {
    playerName,
    team,
    statsLine,
    tier,
    theme,
    edition,
    badge,
    frame: tierFrameStyles(tier),
    themeOverlay: themeOverlayClass(theme),
  };
}

/** Size presets for CardDisplay typography */
export const CARD_DISPLAY_SIZES = {
  default: {
    name: "text-[13px] font-semibold sm:text-[14px]",
    team: "text-[11px] sm:text-xs",
    stats: "text-[10px] sm:text-[11px]",
    pill: "text-[8px] sm:text-[9px]",
    theme: "text-[8px] sm:text-[9px]",
    edition: "text-[8px] sm:text-[9px]",
    footer: "text-[8px] sm:text-[9px]",
    bannerPad: "px-2 py-1.5 sm:px-2.5 sm:py-2",
  },
  detail: {
    name: "text-base font-semibold sm:text-[16px]",
    team: "text-xs sm:text-sm",
    stats: "text-[11px] sm:text-xs",
    pill: "text-[10px] sm:text-[11px]",
    theme: "text-[10px] sm:text-[11px]",
    edition: "text-[10px] sm:text-[11px]",
    footer: "text-[10px] sm:text-[11px]",
    bannerPad: "px-3 py-2.5 sm:px-3.5 sm:py-3",
  },
  compact: {
    name: "text-[11px] font-semibold leading-tight",
    team: "text-[9px] leading-tight",
    stats: "text-[8px] leading-tight",
    pill: "text-[7px]",
    theme: "text-[7px]",
    edition: "text-[7px]",
    footer: "text-[7px]",
    bannerPad: "px-1.5 py-1.5",
  },
  thumb: {
    name: "text-[10px] font-semibold leading-tight",
    team: "text-[8px] leading-tight",
    stats: "text-[7px] leading-tight",
    pill: "text-[6px]",
    theme: "text-[6px]",
    edition: "text-[6px]",
    footer: "text-[6px]",
    bannerPad: "px-1.5 py-1",
  },
};

export function cardDisplaySizeFromFrame(frameClassName = "") {
  const f = frameClassName || "";
  if (f.includes("max-w-md") || f.includes("max-w-sm")) return "detail";
  if (f.includes("max-w-[100px]") || f.includes("max-w-[100")) return "thumb";
  if (f.includes("max-w-[140px]")) return "compact";
  return "default";
}
