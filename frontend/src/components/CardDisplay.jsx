import React from "react";
import AnimatedBadge from "./AnimatedBadge";
import HighlightBadge from "./HighlightBadge";
import RarityBadge from "./RarityBadge";
import AutoSignature from "./AutoSignature";
import {
  CARD_ASPECT_CLASS,
  normalizeTierKey,
  resolveCardDisplayMeta,
  tierFrameStyles,
} from "../utils/cardTemplate";
import { bannerNameModifier, getCardBannerStyles } from "../utils/cardBannerStyles";
import { getHighlightCardStyles } from "../utils/highlightCardStyles";
import { shouldShowThemeIcon } from "../utils/rarityStyles";
import ThemeVideoIcon from "./ThemeVideoIcon";

/**
 * Fixed trading card shell — frame, player media (72%), UI banner (28%).
 */
const CardDisplay = React.forwardRef(function CardDisplay(
  {
    card,
    captureId,
    children,
    size = "default",
    className = "",
    showAnimatedBadge = false,
    showHighlightBadge = false,
    showRarityBadge = true,
    animateSignature = false,
    isHighlight = false,
    inProgressOverlay = false,
    inProgressLabel = "Animation in progress...",
    inProgressTone = "border-violet-400/40 bg-violet-500/20 text-violet-100",
    topRightSlot = null,
  },
  ref
) {
  const meta = resolveCardDisplayMeta(card);

  if (!meta) {
    return (
      <div
        ref={ref}
        data-card-capture-id={captureId || undefined}
        className={`card-display-container flex ${CARD_ASPECT_CLASS} w-full min-w-0 items-center justify-center rounded-[12px] border border-white/10 bg-slate-900/90 ${className}`}
      >
        {children || (
          <span className="px-3 text-center text-xs text-slate-500">Card preview unavailable</span>
        )}
      </div>
    );
  }

  const { tier, theme, rarity, rarityTemplate, templateName, templateTierKey } = meta;
  const bannerStyles = getCardBannerStyles(tier, theme);
  const centerBannerLabel = templateName || "\u00A0";
  const showTemplateInBanner = size === "detail";
  const showThemeIcon = shouldShowThemeIcon(rarity);
  const rarityBadgeSize = size === "detail" ? "detail" : "thumb";
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
  const tierMediaBg = `card-media-bg--${normalizeTierKey(tier)}`;

  return (
    <div
      ref={ref}
      data-card-capture-id={captureId || undefined}
      data-tier={templateTierKey}
      data-template={String(rarityTemplate || 1)}
      data-rarity={rarity || "standard"}
      className={`card-display-container card-shell relative flex w-full min-w-[210px] min-h-0 flex-col overflow-hidden ${shellRadiusClass} ${CARD_ASPECT_CLASS} ${frameClasses} ${className}`}
    >
      {!isHighlight && meta.themeOverlay ? (
        <div className={`pointer-events-none absolute inset-0 z-[4] ${meta.themeOverlay}`} aria-hidden />
      ) : null}

      <div className={`card-shell__media card-image-area ${tierMediaBg}`}>
        <div className={`card-image-area__stack ${mediaWrapperClass}`}>
          {children}
          {!isHighlight && size === "detail" && showThemeIcon ? (
            <ThemeVideoIcon theme={theme} />
          ) : null}
          {!isHighlight ? (
            <div className="card-player-inner-border pointer-events-none absolute inset-0" aria-hidden />
          ) : null}
          <AutoSignature
            playerName={meta.playerName}
            rarity={rarity}
            animate={animateSignature}
          />
          {showRarityBadge ? (
            <div className="card-rarity-badge-slot">
              <RarityBadge rarity={rarity} size={rarityBadgeSize} />
            </div>
          ) : null}
        </div>
        {showAnimatedBadge ? (
          <span className="card-media-badge-slot card-media-badge-slot--right">
            <AnimatedBadge />
          </span>
        ) : null}
        {showHighlightBadge ? (
          <span className="card-media-badge-slot card-media-badge-slot--right">
            <HighlightBadge />
          </span>
        ) : null}
        {topRightSlot ? (
          <div className="card-media-badge-slot card-media-badge-slot--right">{topRightSlot}</div>
        ) : null}
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

        <div
          className={`card-banner__footer shrink-0${showTemplateInBanner ? "" : " card-banner__footer--no-center"}`}
        >
          <div className="card-banner__footer-col card-banner__footer-col--start banner-bottom-left">
            <span className={`card-banner__tier-pill ${bannerStyles.tierPillClass}`}>
              {bannerStyles.tierPillLabel}
            </span>
          </div>
          {showTemplateInBanner ? (
            <div className="card-banner__footer-col card-banner__footer-col--center banner-bottom-center">
              <span className={`card-banner__theme ${bannerStyles.themeClass}`}>
                {centerBannerLabel}
              </span>
            </div>
          ) : null}
          <div className="card-banner__footer-col card-banner__footer-col--end banner-bottom-right">
            <span className={`card-banner__edition ${bannerStyles.editionClass}`}>{meta.edition}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default CardDisplay;
