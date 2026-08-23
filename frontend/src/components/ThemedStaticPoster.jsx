import React from "react";
import ThemeVideoIcon from "./ThemeVideoIcon";
import {
  getHighlightTierBackgroundColor,
  getThemeOverlayColor,
  isHolographicTheme,
} from "../utils/themeOverlayColor";
import { normalizeHighlightThemeKey } from "../utils/highlightCardStyles";

/** Static player photo with the same tier background, tint, and theme icon as highlight/animated video. */
export default function ThemedStaticPoster({
  src,
  theme = "",
  tier = "rookie",
  tintOpacityScale = 1,
  objectFit = "cover",
  wrapperClass = "",
  alt = "Player",
  onError,
  mediaProtectionProps = {},
  showThemeIcon = true,
}) {
  if (!src) return null;

  const tierBackground = getHighlightTierBackgroundColor(tier);
  const themeKey = normalizeHighlightThemeKey(theme);
  const holoTint = isHolographicTheme(theme);
  const overlayColor = holoTint
    ? null
    : getThemeOverlayColor(theme, tier, { opacityScale: tintOpacityScale });
  const fillModeClass = objectFit === "cover" ? "highlight-video-fill--cover" : "";

  return (
    <div
      className={`card-video-area highlight-video-fill ${fillModeClass} ${wrapperClass}`.trim()}
      style={{ backgroundColor: tierBackground }}
    >
      <img
        src={src}
        alt=""
        aria-hidden
        className="card-video-area__bg highlight-video-fill__bg"
        loading="lazy"
        decoding="async"
        onError={() => {}}
        {...mediaProtectionProps}
      />

      {holoTint ? (
        <div
          className={`card-video-area__tint card-video-area__tint--holo${
            tintOpacityScale < 1 ? " card-video-area__tint--subtle" : ""
          }`}
          aria-hidden
        />
      ) : overlayColor && overlayColor !== "rgba(0, 0, 0, 0)" ? (
        <div
          className="card-video-area__tint"
          style={{ backgroundColor: overlayColor }}
          aria-hidden
        />
      ) : null}

      <img
        src={src}
        alt={alt}
        className="card-video-area__fg highlight-video-fill__fg"
        style={{ objectFit: objectFit === "cover" ? "cover" : "contain", objectPosition: "center" }}
        loading="lazy"
        decoding="async"
        onError={onError}
        {...mediaProtectionProps}
      />

      {holoTint ? (
        <div
          className={`card-video-area__tint card-video-area__tint--holo card-video-area__tint--foreground${
            tintOpacityScale < 1 ? " card-video-area__tint--subtle" : ""
          }`}
          aria-hidden
        />
      ) : overlayColor && overlayColor !== "rgba(0, 0, 0, 0)" ? (
        <div
          className="card-video-area__tint card-video-area__tint--foreground"
          style={{ backgroundColor: overlayColor }}
          aria-hidden
        />
      ) : null}

      {showThemeIcon ? <ThemeVideoIcon themeKey={themeKey} /> : null}
    </div>
  );
}
