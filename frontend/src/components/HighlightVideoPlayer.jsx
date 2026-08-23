import React, { useRef } from "react";
import { useHighlightTrimVideo } from "../hooks/useHighlightTrimVideo";
import ThemeVideoIcon from "./ThemeVideoIcon";
import {
  getHighlightTierBackgroundColor,
  getThemeOverlayColor,
  isHolographicTheme,
} from "../utils/themeOverlayColor";
import { normalizeHighlightThemeKey } from "../utils/highlightCardStyles";

function HighlightSoundToggle({ muted, onToggle, position = "left" }) {
  const positionClass = position === "right" ? "bottom-2 right-2" : "bottom-2 left-2";
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
      title={muted ? "Tap to unmute" : "Tap to mute"}
      aria-label={muted ? "Tap to unmute" : "Tap to mute"}
      className={`card-video-area__sound-toggle absolute ${positionClass} z-[8] flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/60 text-sm text-white backdrop-blur-sm transition hover:bg-black/75`}
    >
      {muted ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 5L6 9H3v6h3l5 4V5z" />
          <line x1="17" y1="9" x2="23" y2="15" />
          <line x1="23" y1="9" x2="17" y2="15" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 5L6 9H3v6h3l5 4V5z" />
          <path d="M15.5 8.5a5 5 0 010 7" />
          <path d="M18 6a8 8 0 010 12" />
        </svg>
      )}
    </button>
  );
}

/**
 * Highlight video stack: oversized blurred backdrop, theme tint, sharp foreground, theme icon.
 * Both videos share the same src — no sync listeners.
 */
function HighlightVideoPlayer({
  videoSrc,
  videoKey = "highlight",
  theme = "",
  tier = "rookie",
  tintOpacityScale = 1,
  playing = false,
  trimStart = 0,
  trimEnd = null,
  muted = true,
  autoPlay = false,
  wrapperClass = "",
  ariaLabel = "Highlight card",
  onError,
  mediaProtectionProps = {},
  showSoundToggle = false,
  soundMuted = true,
  onToggleSound,
  objectFit = "contain",
  soundTogglePosition = "left",
  showThemeIcon = true,
}) {
  const foregroundRef = useRef(null);

  const { hasTrimWindow } = useHighlightTrimVideo({
    videoRef: foregroundRef,
    videoSrc,
    trimStart,
    trimEnd,
    playing,
  });

  if (!videoSrc) return null;

  const shouldPlay = playing || autoPlay;
  const foregroundLoop = !hasTrimWindow;
  const tierBackground = getHighlightTierBackgroundColor(tier);
  const themeKey = normalizeHighlightThemeKey(theme);
  const holoTint = isHolographicTheme(theme);
  const overlayColor = holoTint
    ? null
    : getThemeOverlayColor(theme, tier, { opacityScale: tintOpacityScale });

  const foregroundObjectFit = objectFit === "cover" ? "cover" : "contain";
  const fillModeClass = objectFit === "cover" ? "highlight-video-fill--cover" : "";

  return (
    <div
      className={`card-video-area highlight-video-fill ${fillModeClass} ${wrapperClass}`.trim()}
      style={{ backgroundColor: tierBackground }}
    >
      <video
        key={`${videoKey}-bg`}
        src={videoSrc}
        className="card-video-area__bg highlight-video-fill__bg"
        autoPlay={shouldPlay}
        loop
        muted
        playsInline
        preload="metadata"
        aria-hidden
        tabIndex={-1}
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

      <video
        key={`${videoKey}-fg`}
        ref={foregroundRef}
        src={videoSrc}
        className="card-video-area__fg highlight-video-fill__fg"
        style={{ objectFit: foregroundObjectFit, objectPosition: "center" }}
        autoPlay={shouldPlay}
        loop={foregroundLoop}
        muted={muted}
        playsInline
        preload="auto"
        aria-label={ariaLabel}
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

      {showThemeIcon ? (
        <ThemeVideoIcon themeKey={themeKey} className="card-video-area__theme-icon--above-tint" />
      ) : null}

      {showSoundToggle && onToggleSound ? (
        <HighlightSoundToggle
          muted={soundMuted}
          onToggle={onToggleSound}
          position={soundTogglePosition}
        />
      ) : null}
    </div>
  );
}

export default React.memo(HighlightVideoPlayer, (prev, next) => {
  return (
    prev.videoSrc === next.videoSrc &&
    prev.videoKey === next.videoKey &&
    prev.theme === next.theme &&
    prev.tier === next.tier &&
    prev.tintOpacityScale === next.tintOpacityScale &&
    prev.playing === next.playing &&
    prev.trimStart === next.trimStart &&
    prev.trimEnd === next.trimEnd &&
    prev.muted === next.muted &&
    prev.autoPlay === next.autoPlay &&
    prev.wrapperClass === next.wrapperClass &&
    prev.ariaLabel === next.ariaLabel &&
    prev.showSoundToggle === next.showSoundToggle &&
    prev.soundMuted === next.soundMuted &&
    prev.onError === next.onError &&
    prev.onToggleSound === next.onToggleSound
  );
});
