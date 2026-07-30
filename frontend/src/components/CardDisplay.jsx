import React from "react";
import AnimatedBadge from "./AnimatedBadge";
import HighlightBadge from "./HighlightBadge";
import {
  CARD_ASPECT_CLASS,
  CARD_DISPLAY_SIZES,
  resolveCardDisplayMeta,
} from "../utils/cardTemplate";

/**
 * Fixed 4-layer trading card shell — frame, player media, UI banner, theme overlay.
 * Media (layer 2) is injected via children; banner and frame are always UI-controlled.
 */
export default function CardDisplay({
  card,
  children,
  size = "default",
  className = "",
  showAnimatedBadge = false,
  showHighlightBadge = false,
  inProgressOverlay = false,
  inProgressLabel = "Animation in progress...",
  inProgressTone = "border-violet-400/40 bg-violet-500/20 text-violet-100",
  topRightSlot = null,
}) {
  const meta = resolveCardDisplayMeta(card);
  const styles = CARD_DISPLAY_SIZES[size] || CARD_DISPLAY_SIZES.default;

  if (!meta) {
    return (
      <div
        className={`flex ${CARD_ASPECT_CLASS} w-full min-w-0 items-center justify-center rounded-[12px] border border-white/10 bg-slate-900/90 ${className}`}
      >
        {children || (
          <span className="px-3 text-center text-xs text-slate-500">Card preview unavailable</span>
        )}
      </div>
    );
  }

  const { frame, badge, themeOverlay } = meta;

  return (
    <div
      className={`relative flex w-full min-w-0 flex-col overflow-hidden rounded-[12px] ${CARD_ASPECT_CLASS} ${frame.borderClass} ${frame.glowClass} ${frame.bgClass} ${className}`}
    >
      {themeOverlay ? <div className={`pointer-events-none absolute inset-0 z-[4] ${themeOverlay}`} aria-hidden /> : null}

      <div className="relative z-[1] h-[70%] min-h-0 w-full shrink-0 overflow-hidden">
        <div className="card-player-vignette relative h-full w-full overflow-hidden">
          {children}
          <div className="card-player-inner-border pointer-events-none absolute inset-0" aria-hidden />
        </div>
        {showAnimatedBadge ? (
          <span className="absolute right-1.5 top-1.5 z-[3] sm:right-2 sm:top-2">
            <AnimatedBadge />
          </span>
        ) : null}
        {showHighlightBadge ? (
          <span className="absolute right-1.5 top-1.5 z-[3] sm:right-2 sm:top-2">
            <HighlightBadge />
          </span>
        ) : null}
        {topRightSlot ? <div className="absolute right-1 top-1 z-[3]">{topRightSlot}</div> : null}
        {inProgressOverlay ? (
          <div className="absolute inset-0 z-[5] flex items-center justify-center bg-black/55 backdrop-blur-[2px]">
            <span className={`animate-pulse rounded-lg border px-2 py-1 text-[10px] font-semibold sm:px-3 sm:py-2 sm:text-xs ${inProgressTone}`}>
              {inProgressLabel}
            </span>
          </div>
        ) : null}
      </div>

      <div
        className={`relative z-[2] flex h-[30%] min-h-0 shrink-0 flex-col justify-between border-t bg-gradient-to-b ${frame.bannerClass} ${frame.accentClass} ${styles.bannerPad}`}
      >
        <div className="min-h-0 flex-1">
          <p className={`leading-tight text-white break-words [overflow-wrap:anywhere] ${styles.name}`}>
            {meta.playerName}
          </p>
          {meta.team ? (
            <p className={`mt-0.5 text-slate-300 break-words [overflow-wrap:anywhere] ${styles.team}`}>
              {meta.team}
            </p>
          ) : null}
          {meta.statsLine ? (
            <p className={`mt-0.5 text-slate-400 ${styles.stats}`}>{meta.statsLine}</p>
          ) : null}
        </div>

        <div className="mt-1 flex items-end justify-between gap-2">
          <span
            className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 font-semibold ${badge.pill} ${styles.pill}`}
          >
            {badge.label}
          </span>
          <div className={`min-w-0 text-right ${styles.meta}`}>
            {meta.cardId ? (
              <p className="font-mono text-slate-400 break-all leading-tight">{meta.cardId}</p>
            ) : null}
            {meta.edition ? <p className="mt-0.5 tabular-nums text-slate-500">{meta.edition}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
