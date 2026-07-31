import React from "react";
import AnimatedBadge from "./AnimatedBadge";
import HighlightBadge from "./HighlightBadge";
import {
  CARD_ASPECT_CLASS,
  resolveCardDisplayMeta,
  tierFrameStyles,
} from "../utils/cardTemplate";
import { bannerNameModifier, getCardBannerStyles } from "../utils/cardBannerStyles";
import { getHighlightCardStyles } from "../utils/highlightCardStyles";
import HighlightThemeDecor from "./HighlightThemeDecor";

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
  const bannerSize = size === "detail" || size === "compact" || size === "thumb" ? size : "default";
  const sizeClass = `card-banner--size-${bannerSize}`;
  const nameModifier = bannerNameModifier(meta.playerName, bannerSize);

  const highlightFrameClass =
    highlightStyles?.frameClass || "highlight-card highlight-card--rookie";
  const highlightMediaClass =
    highlightStyles?.mediaClass || "highlight-card__media highlight-card__media--rookie";

  const frameClasses = isHighlight
    ? `${highlightFrameClass} bg-black`
    : `${frame.borderClass} ${frame.glowClass} ${frame.bgClass}`;

  const mediaWrapperClass = isHighlight
    ? `${highlightMediaClass} card-player-vignette relative h-full w-full overflow-hidden`
    : "card-player-vignette relative h-full w-full overflow-hidden";

  const shellRadiusClass = size === "detail" ? "card-shell--detail rounded-[16px]" : "rounded-[12px]";

  return (
    <div
      className={`card-shell relative flex w-full min-w-[210px] min-h-0 flex-col overflow-hidden ${shellRadiusClass} ${CARD_ASPECT_CLASS} ${frameClasses} ${className}`}
    >
      {isHighlight && highlightStyles?.themeKey && highlightStyles.themeKey !== "default" ? (
        <HighlightThemeDecor themeKey={highlightStyles.themeKey} />
      ) : null}

      {!isHighlight && meta.themeOverlay ? (
        <div className={`pointer-events-none absolute inset-0 z-[4] ${meta.themeOverlay}`} aria-hidden />
      ) : null}

      <div className="card-shell__media relative z-[1] flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        <div className={`${mediaWrapperClass} h-full min-h-0 w-full flex-1`}>
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
        className={`card-shell__banner relative z-[2] flex shrink-0 flex-col justify-between ${bannerStyles.bannerClass} ${sizeClass}`}
      >
        <div className="card-banner__body flex flex-col justify-center text-center">
          <p
            className={`card-banner__name ${bannerStyles.nameClass} ${nameModifier}`.trim()}
          >
            {meta.playerName}
          </p>
          <p className={`card-banner__team ${bannerStyles.teamClass}`}>{meta.team || "\u00A0"}</p>
          <p className={`card-banner__stats ${bannerStyles.statsClass}`}>{meta.statsLine || "\u00A0"}</p>
        </div>

        <div className="card-banner__footer shrink-0">
          <span className={`card-banner__tier-pill ${bannerStyles.tierPillClass}`}>
            {bannerStyles.tierPillLabel}
          </span>
          <span className={`card-banner__theme ${bannerStyles.themeClass}`}>
            {bannerStyles.themeLabel || "\u00A0"}
          </span>
          <span className={`card-banner__edition ${bannerStyles.editionClass}`}>{meta.edition}</span>
        </div>
      </div>
    </div>
  );
}
