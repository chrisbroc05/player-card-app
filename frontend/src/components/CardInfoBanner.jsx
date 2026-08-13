import React from "react";
import { vaultTierBadge, formatEditionShort } from "../utils/tierStyles";

function formatThemeLabel(theme) {
  const t = (theme || "").trim().toLowerCase();
  if (!t || t === "none") return null;
  return t
    .split(/[_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function resolveCardMeta(card) {
  if (!card || typeof card !== "object") return null;
  const playerName = (card.player_name || card.playerName || "").trim();
  if (!playerName) return null;

  const team = (card.team_name || card.teamName || "").trim();
  const position = (card.position || "").trim();
  const jersey = (card.jersey_number ?? card.jerseyNumber ?? "").toString().trim();
  const gradYear = (card.grad_year ?? card.gradYear ?? "").toString().trim();
  const tier = card.tier || "rookie";
  const theme = formatThemeLabel(card.theme || card.special_theme || card.specialTheme);
  const edition = formatEditionShort(card.edition_number, card.print_run);

  const stats = [
    position || null,
    jersey ? `#${jersey.replace(/^#/, "")}` : null,
    gradYear ? gradYear : null,
  ].filter(Boolean);

  return { playerName, team, stats, tier, theme, edition };
}

/** Player info strip below card art — tier-accented, no text baked into the image */
export default function CardInfoBanner({ card, variant = "default", className = "" }) {
  const meta = resolveCardMeta(card);
  if (!meta) return null;

  const badge = vaultTierBadge(meta.tier);
  const compact = variant === "compact";

  const tierBorder =
    meta.tier === "legends"
      ? "border-amber-400/40"
      : meta.tier === "allstar"
        ? "border-[var(--color-allstar)]/40"
        : "border-orange-500/35";

  const tierGradient =
    meta.tier === "legends"
      ? "from-amber-500/12 via-cardBg2 to-cardBg"
      : meta.tier === "allstar"
        ? "from-[rgba(26,106,181,0.12)] via-cardBg2 to-cardBg"
        : "from-orange-500/10 via-cardBg2 to-cardBg";

  return (
    <div
      className={`border-t ${tierBorder} bg-gradient-to-b ${tierGradient} ${compact ? "rounded-b-lg px-2 py-2" : "rounded-b-xl px-3 py-3 sm:px-4 sm:py-3.5"} ${className}`.trim()}
    >
      <div className={`flex flex-wrap items-start justify-between gap-2 ${compact ? "gap-1.5" : ""}`}>
        <div className="min-w-0 flex-1">
          <p
            className={`truncate font-semibold text-white ${compact ? "text-xs" : "text-sm sm:text-base"}`}
            title={meta.playerName}
          >
            {meta.playerName}
          </p>
          {meta.team ? (
            <p className={`truncate text-slate-400 ${compact ? "text-[10px]" : "text-xs sm:text-sm"}`} title={meta.team}>
              {meta.team}
            </p>
          ) : null}
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 font-semibold ${badge.pill} ${
            compact ? "text-[9px]" : "text-[10px] sm:text-[11px]"
          }`}
        >
          {badge.label}
        </span>
      </div>

      {meta.stats.length > 0 ? (
        <p className={`mt-1.5 text-slate-500 ${compact ? "text-[9px]" : "text-[11px] sm:text-xs"}`}>
          {meta.stats.join(" · ")}
        </p>
      ) : null}

      <div className={`mt-2 flex flex-wrap items-center gap-1.5 ${compact ? "mt-1.5" : ""}`}>
        {meta.theme ? (
          <span
            className={`rounded border border-white/10 bg-white/5 text-slate-400 ${
              compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"
            }`}
          >
            {meta.theme}
          </span>
        ) : null}
        <span
          className={`tabular-nums text-slate-500 ${compact ? "text-[9px]" : "text-[10px] sm:text-[11px]"}`}
        >
          {meta.edition}
        </span>
      </div>
    </div>
  );
}
