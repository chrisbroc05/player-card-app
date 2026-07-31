import React, { useRef } from "react";
import { useHighlightTrimVideo } from "../hooks/useHighlightTrimVideo";

function HighlightSoundToggle({ muted, onToggle }) {
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
      className="absolute bottom-2 right-2 z-[8] flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/60 text-sm text-white backdrop-blur-sm transition hover:bg-black/75"
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
 * Two-layer highlight video: blurred cover backdrop + sharp contain foreground.
 * Both layers autoplay independently from the same src — no timeupdate sync.
 */
function HighlightVideoPlayer({
  videoSrc,
  videoKey = "highlight",
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

  return (
    <div className={`highlight-video-fill ${wrapperClass}`.trim()}>
      <video
        key={`${videoKey}-bg`}
        src={videoSrc}
        className="highlight-video-fill__bg"
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
      <video
        key={`${videoKey}-fg`}
        ref={foregroundRef}
        src={videoSrc}
        className="highlight-video-fill__fg"
        autoPlay={shouldPlay}
        loop={foregroundLoop}
        muted={muted}
        playsInline
        preload="auto"
        aria-label={ariaLabel}
        onError={onError}
        {...mediaProtectionProps}
      />
      {showSoundToggle && onToggleSound ? (
        <HighlightSoundToggle muted={soundMuted} onToggle={onToggleSound} />
      ) : null}
    </div>
  );
}

export default React.memo(HighlightVideoPlayer, (prev, next) => {
  return (
    prev.videoSrc === next.videoSrc &&
    prev.videoKey === next.videoKey &&
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
