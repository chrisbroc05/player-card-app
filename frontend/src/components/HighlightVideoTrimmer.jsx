import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MAX_HIGHLIGHT_CLIP_SECONDS,
  clampTrimRange,
  formatHighlightTime,
  initialTrimRange,
} from "../utils/highlightVideo";
import { vaultTierBadge } from "../utils/tierStyles";

const MIN_TRIM_GAP_SECONDS = 1;

function spanSeconds(trimStart, trimEnd) {
  return Math.max(0, trimEnd - trimStart);
}

function clampHandleTime(handle, time, trimStart, trimEnd, duration) {
  const safeDuration = Math.max(0, Number(duration) || 0);
  let nextStart = trimStart;
  let nextEnd = trimEnd;

  if (handle === "start") {
    nextStart = Math.max(0, Math.min(time, nextEnd - MIN_TRIM_GAP_SECONDS));
    if (nextEnd - nextStart > MAX_HIGHLIGHT_CLIP_SECONDS) {
      nextStart = nextEnd - MAX_HIGHLIGHT_CLIP_SECONDS;
    }
  } else {
    nextEnd = Math.min(safeDuration, Math.max(time, nextStart + MIN_TRIM_GAP_SECONDS));
    if (nextEnd - nextStart > MAX_HIGHLIGHT_CLIP_SECONDS) {
      nextEnd = nextStart + MAX_HIGHLIGHT_CLIP_SECONDS;
    }
  }

  return clampTrimRange(nextStart, nextEnd, safeDuration);
}

export default function HighlightVideoTrimmer({
  objectUrl,
  file,
  duration,
  initialTrimStart,
  initialTrimEnd,
  tier = "rookie",
  onConfirm,
  onChooseDifferent,
}) {
  const videoRef = useRef(null);
  const trackRef = useRef(null);
  const rafRef = useRef(null);
  const trimRef = useRef({ trimStart: 0, trimEnd: 0 });

  const [trimStart, setTrimStart] = useState(initialTrimStart ?? 0);
  const [trimEnd, setTrimEnd] = useState(initialTrimEnd ?? Math.min(duration, MAX_HIGHLIGHT_CLIP_SECONDS));
  const [isDragging, setIsDragging] = useState(null);

  const tierAccent = vaultTierBadge(tier).accent;

  useEffect(() => {
    trimRef.current = { trimStart, trimEnd };
  }, [trimStart, trimEnd]);

  useEffect(() => {
    const initial = initialTrimRange(duration);
    setTrimStart(initialTrimStart ?? initial.trimStart);
    setTrimEnd(initialTrimEnd ?? initial.trimEnd);
  }, [duration, initialTrimStart, initialTrimEnd, objectUrl]);

  const selectedSpan = useMemo(() => spanSeconds(trimStart, trimEnd), [trimStart, trimEnd]);
  const atMaxDuration = selectedSpan >= MAX_HIGHLIGHT_CLIP_SECONDS - 0.01;

  const readout = useMemo(() => {
    const secs = Math.round(selectedSpan * 10) / 10;
    const secsLabel = Number.isInteger(secs) ? `${secs}s` : `${secs.toFixed(1)}s`;
    return `Selected: ${formatHighlightTime(trimStart)} → ${formatHighlightTime(trimEnd)} (${secsLabel})`;
  }, [trimStart, trimEnd, selectedSpan]);

  const scheduleScrub = useCallback((time) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const video = videoRef.current;
      if (!video) return;
      try {
        video.currentTime = time;
      } catch {
        /* ignore seek errors during drag */
      }
    });
  }, []);

  const playTrimmedSection = useCallback(() => {
    const video = videoRef.current;
    if (!video || isDragging) return;
    video.currentTime = trimRef.current.trimStart;
    video.play().catch(() => {});
  }, [isDragging]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || isDragging) return undefined;

    const onTimeUpdate = () => {
      const { trimStart: start, trimEnd: end } = trimRef.current;
      if (video.currentTime >= end - 0.05) {
        video.currentTime = start;
        if (!video.paused) video.play().catch(() => {});
      }
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, [isDragging, trimStart, trimEnd]);

  const positionToTime = useCallback(
    (clientX) => {
      const track = trackRef.current;
      if (!track || duration <= 0) return 0;
      const rect = track.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return ratio * duration;
    },
    [duration]
  );

  const applyDrag = useCallback(
    (clientX, handle) => {
      const { trimStart: currentStart, trimEnd: currentEnd } = trimRef.current;
      const time = positionToTime(clientX);
      const clamped = clampHandleTime(handle, time, currentStart, currentEnd, duration);
      trimRef.current = clamped;
      setTrimStart(clamped.trimStart);
      setTrimEnd(clamped.trimEnd);
      scheduleScrub(handle === "start" ? clamped.trimStart : clamped.trimEnd);
    },
    [duration, positionToTime, scheduleScrub]
  );

  const handleTrimDragStart = useCallback((handle) => {
    videoRef.current?.pause();
    setIsDragging(handle);
  }, []);

  const handleTrimDragEnd = useCallback(() => {
    setIsDragging(null);
    const video = videoRef.current;
    if (!video) return;
    const { trimStart: start } = trimRef.current;
    try {
      video.currentTime = start;
    } catch {
      /* ignore */
    }
    video.play().catch(() => {});
  }, []);

  useEffect(() => {
    if (!isDragging) return undefined;

    const onPointerMove = (event) => {
      event.preventDefault();
      applyDrag(event.clientX, isDragging);
    };

    const onPointerEnd = () => {
      handleTrimDragEnd();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
    };
  }, [isDragging, applyDrag, handleTrimDragEnd]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const startPct = duration > 0 ? (trimStart / duration) * 100 : 0;
  const endPct = duration > 0 ? (trimEnd / duration) * 100 : 100;

  const handleConfirm = () => {
    onConfirm?.({
      file,
      objectUrl,
      duration,
      trimStart,
      trimEnd,
      confirmed: true,
    });
  };

  return (
    <div className="highlight-trimmer">
      <div className="highlight-trimmer__player-wrap">
        <video
          ref={videoRef}
          src={objectUrl}
          className="highlight-trimmer__video"
          playsInline
          muted
          controls={false}
          preload="auto"
          onClick={playTrimmedSection}
        />
        <div className="highlight-trimmer__player-bar">
          <p className="highlight-trimmer__player-hint">Tap video to play selected clip</p>
          <button type="button" onClick={playTrimmedSection} className="highlight-trimmer__play-btn">
            Play Clip
          </button>
        </div>
      </div>

      <div className="highlight-trimmer__controls">
        <div
          ref={trackRef}
          className="highlight-trimmer__track"
          style={{ "--trim-accent": tierAccent }}
        >
          <div className="highlight-trimmer__track-bg" aria-hidden />
          <div
            className="highlight-trimmer__selection"
            style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }}
            aria-hidden
          />

          <button
            type="button"
            aria-label="Trim start"
            className={`highlight-trimmer__handle highlight-trimmer__handle--start${
              isDragging === "start" ? " highlight-trimmer__handle--active" : ""
            }`}
            style={{ left: `${startPct}%` }}
            onPointerDown={(event) => {
              event.preventDefault();
              event.currentTarget.setPointerCapture?.(event.pointerId);
              handleTrimDragStart("start");
            }}
          >
            {isDragging === "start" ? (
              <span className="highlight-trimmer__handle-label">Start: {formatHighlightTime(trimStart)}</span>
            ) : null}
          </button>

          <button
            type="button"
            aria-label="Trim end"
            className={`highlight-trimmer__handle highlight-trimmer__handle--end${
              isDragging === "end" ? " highlight-trimmer__handle--active" : ""
            }`}
            style={{ left: `${endPct}%` }}
            onPointerDown={(event) => {
              event.preventDefault();
              event.currentTarget.setPointerCapture?.(event.pointerId);
              handleTrimDragStart("end");
            }}
          >
            {isDragging === "end" ? (
              <span className="highlight-trimmer__handle-label">End: {formatHighlightTime(trimEnd)}</span>
            ) : null}
          </button>
        </div>

        <p className="highlight-trimmer__readout">{readout}</p>
        {isDragging && atMaxDuration ? (
          <p className="highlight-trimmer__warn">Maximum 10 seconds — adjust your trim</p>
        ) : (
          <p className="highlight-trimmer__hint">Drag handles to pick up to 10 seconds.</p>
        )}
      </div>

      <div className="highlight-trimmer__actions">
        <button type="button" onClick={onChooseDifferent} className="highlight-trimmer__btn highlight-trimmer__btn--secondary">
          Choose Different Video
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={selectedSpan <= 0}
          className="highlight-trimmer__btn highlight-trimmer__btn--primary"
        >
          Use This Clip
        </button>
      </div>
    </div>
  );
}
