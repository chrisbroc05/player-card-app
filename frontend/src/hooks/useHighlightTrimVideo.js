import { useEffect, useMemo, useState } from "react";

/**
 * HTML5 trim loop: seek to trimStart on load, loop trimmed section via timeupdate.
 */
export function useHighlightTrimVideo({
  videoRef,
  videoSrc,
  trimStart = 0,
  trimEnd = null,
  playing = false,
}) {
  const start = Number(trimStart) || 0;
  const end = trimEnd != null && trimEnd !== "" ? Number(trimEnd) : null;
  const hasTrimWindow = end != null && end > start;

  const [ready, setReady] = useState(false);

  const loopEnd = useMemo(() => {
    if (!hasTrimWindow) return null;
    return end;
  }, [hasTrimWindow, end]);

  useEffect(() => {
    setReady(false);
  }, [videoSrc]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoSrc) return undefined;

    const seekToStart = () => {
      try {
        el.currentTime = start;
      } catch {
        /* ignore */
      }
    };

    const onLoadedMetadata = () => {
      setReady(true);
      seekToStart();
    };

    const onTimeUpdate = () => {
      const duration = Number(el.duration) || 0;
      const stopAt = loopEnd ?? duration;
      if (stopAt <= start || duration <= 0) return;
      if (el.currentTime >= stopAt - 0.05) {
        seekToStart();
        if (playing) el.play().catch(() => {});
      }
    };

    el.addEventListener("loadedmetadata", onLoadedMetadata);
    el.addEventListener("timeupdate", onTimeUpdate);
    if (el.readyState >= 1) onLoadedMetadata();

    return () => {
      el.removeEventListener("loadedmetadata", onLoadedMetadata);
      el.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [videoSrc, start, loopEnd, playing, videoRef]);

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
  }, [playing, videoSrc, start, videoRef, ready]);

  return { hasTrimWindow: Boolean(loopEnd && loopEnd > start), ready };
}
