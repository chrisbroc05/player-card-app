import { useEffect, useRef } from "react";

function normalizeTrimBounds(trimStart, trimEnd) {
  const start = Number(trimStart);
  const safeStart = Number.isFinite(start) && start >= 0 ? start : 0;
  const endRaw = trimEnd != null && trimEnd !== "" ? Number(trimEnd) : null;
  const safeEnd =
    endRaw != null && Number.isFinite(endRaw) && endRaw > safeStart ? endRaw : null;
  return { start: safeStart, end: safeEnd, hasTrimWindow: safeEnd != null };
}

/**
 * HTML5 trim loop on a single video element — no React state updates during playback.
 */
export function useHighlightTrimVideo({
  videoRef,
  videoSrc,
  trimStart = 0,
  trimEnd = null,
  playing = false,
}) {
  const { start, end, hasTrimWindow } = normalizeTrimBounds(trimStart, trimEnd);
  const playingRef = useRef(playing);
  playingRef.current = playing;

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoSrc) return undefined;

    const seekToStart = () => {
      try {
        el.currentTime = start;
      } catch {
        /* ignore seek errors during load */
      }
    };

    const onLoadedMetadata = () => {
      seekToStart();
    };

    const onTimeUpdate = () => {
      if (!hasTrimWindow || end == null) return;
      const duration = Number(el.duration);
      const stopAt = Number.isFinite(duration) && duration > 0 ? Math.min(end, duration) : end;
      if (stopAt <= start) return;
      if (el.currentTime >= stopAt - 0.05) {
        seekToStart();
        if (playingRef.current) el.play().catch(() => {});
      }
    };

    el.addEventListener("loadedmetadata", onLoadedMetadata);
    el.addEventListener("timeupdate", onTimeUpdate);
    if (el.readyState >= 1) onLoadedMetadata();

    return () => {
      el.removeEventListener("loadedmetadata", onLoadedMetadata);
      el.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [videoSrc, start, end, hasTrimWindow]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoSrc) return;
    if (playing) {
      el.play().catch(() => {});
    } else {
      el.pause();
      try {
        el.currentTime = start;
      } catch {
        /* ignore */
      }
    }
  }, [playing, videoSrc, start]);

  return { hasTrimWindow };
}
