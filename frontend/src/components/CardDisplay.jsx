import React from "react";
import AnimatedBadge from "./AnimatedBadge";
import HighlightBadge from "./HighlightBadge";
import {
  CARD_ASPECT_CLASS,
  CARD_DISPLAY_SIZES,
  resolveCardDisplayMeta,
  tierFrameStyles,
} from "../utils/cardTemplate";
import { getCardBannerStyles, truncateBannerPlayerName } from "../utils/cardBannerStyles";
import { getHighlightCardStyles } from "../utils/highlightCardStyles";

/**
 * Fixed trading card shell — frame, player media (72%), UI banner (28%).
 */
export default function CardDisplay({
  card,
  children,
  size = "default",
  className = "",
  showAnimatedBadge = false,
  showHighlightBadge = false,
  isHighlight = false,
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

  const { tier, theme } = meta;
  const bannerStyles = getCardBannerStyles(tier, theme);
  const highlightStyles = isHighlight ? getHighlightCardStyles(tier, theme) : null;
  const frame = tierFrameStyles(tier);

  const frameClasses = isHighlight
    ? `${highlightStyles.frameClass} bg-black`
    : `${frame.borderClass} ${frame.glowClass} ${frame.bgClass}`;

  const mediaWrapperClass = isHighlight
    ? `${highlightStyles.mediaClass} card-player-vignette relative h-full w-full overflow-hidden`
    : "card-player-vignette relative h-full w-full overflow-hidden";

  const displayName = truncateBannerPlayerName(meta.playerName);

  return (
    <div
      className={`relative flex w-full min-w-0 flex-col overflow-hidden rounded-[12px] ${CARD_ASPECT_CLASS} ${frameClasses} ${className}`}
    >
      {!isHighlight && meta.themeOverlay ? (
        <div className={`pointer-events-none absolute inset-0 z-[4] ${meta.themeOverlay}`} aria-hidden />
      ) : null}

      <div className="card-shell__media relative z-[1] h-[72%] min-h-0 w-full shrink-0 overflow-hidden">
        <div className={mediaWrapperClass}>
          {children}
          {!isHighlight ? (
            <div className="card-player-inner-border pointer-events-none absolute inset-0" aria-hidden />
          ) : null}
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
            <span
              className={`animate-pulse rounded-lg border px-2 py-1 text-[10px] font-semibold sm:px-3 sm:py-2 sm:text-xs ${inProgressTone}`}
            >
              {inProgressLabel}
            </span>
          </div>
        ) : null}
      </div>

      <div
        className={`card-shell__banner relative z-[2] flex h-[28%] min-h-[4.25rem] shrink-0 flex-col overflow-hidden ${bannerStyles.bannerClass} ${styles.bannerPad}`}
      >
        <div className="card-banner__body min-h-0 flex-1 overflow-hidden">
          <p
            className={`${bannerStyles.nameClass} ${styles.name} truncate leading-tight`}
            title={meta.playerName.length > 20 ? meta.playerName : undefined}
          >
            {displayName}
          </p>
          {meta.team ? (
            <p className={`${bannerStyles.teamClass} ${styles.team} mt-0.5 truncate leading-tight`}>{meta.team}</p>
          ) : null}
          {meta.statsLine ? (
            <p className={`${bannerStyles.statsClass} ${styles.stats} mt-0.5 truncate leading-tight`}>
              {meta.statsLine}
            </p>
          ) : null}
        </div>

        <div className={`card-banner__footer mt-1 flex shrink-0 items-center gap-1.5 ${styles.footer}`}>
          <span className={`${bannerStyles.tierPillClass} ${styles.pill} shrink-0`}>
            {bannerStyles.tierPillLabel}
          </span>
          {bannerStyles.themeLabel ? (
            <span className={`${bannerStyles.themeClass} ${styles.theme} min-w-0 flex-1 truncate text-center`}>
              {bannerStyles.themeLabel}
            </span>
          ) : (
            <span className="min-w-0 flex-1" aria-hidden />
          )}
          <span className={`${bannerStyles.editionClass} ${styles.edition} shrink-0 tabular-nums`}>
            {meta.edition}
          </span>
        </div>
      </div>
    </div>
  );
}
