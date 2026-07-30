import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MAX_HIGHLIGHT_CLIP_SECONDS,
  clampTrimRange,
  formatHighlightTime,
  initialTrimRange,
} from "../utils/highlightVideo";

function spanSeconds(trimStart, trimEnd) {
  return Math.max(0, trimEnd - trimStart);
}

export default function HighlightVideoTrimmer({ objectUrl, file, duration, initialTrimStart, initialTrimEnd, onConfirm, onChooseDifferent }) {
  const videoRef = useRef(null);
  const trackRef = useRef(null);
  const dragRef = useRef(null);

  const [trimStart, setTrimStart] = useState(initialTrimStart ?? 0);
  const [trimEnd, setTrimEnd] = useState(initialTrimEnd ?? Math.min(duration, MAX_HIGHLIGHT_CLIP_SECONDS));

  useEffect(() => {
    const initial = initialTrimRange(duration);
    setTrimStart(initialTrimStart ?? initial.trimStart);
    setTrimEnd(initialTrimEnd ?? initial.trimEnd);
  }, [duration, initialTrimStart, initialTrimEnd, objectUrl]);

  const selectedSpan = useMemo(() => spanSeconds(trimStart, trimEnd), [trimStart, trimEnd]);

  const readout = useMemo(() => {
    const secs = Math.round(selectedSpan);
    return `Selected: ${formatHighlightTime(trimStart)} — ${formatHighlightTime(trimEnd)} (${secs} ${secs === 1 ? "second" : "seconds"})`;
  }, [trimStart, trimEnd, selectedSpan]);

  const playTrimmedSection = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = trimStart;
    video.play().catch(() => {});
  }, [trimStart]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      if (video.currentTime >= trimEnd - 0.05) {
        video.pause();
        video.currentTime = trimStart;
      }
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, [trimStart, trimEnd]);

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

  const beginDrag = (handle) => (event) => {
    event.preventDefault();
    dragRef.current = { handle, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    const time = positionToTime(event.clientX);
    if (drag.handle === "start") {
      let nextStart = time;
      let nextEnd = trimEnd;
      if (nextEnd - nextStart > MAX_HIGHLIGHT_CLIP_SECONDS) {
        nextStart = nextEnd - MAX_HIGHLIGHT_CLIP_SECONDS;
      }
      const clamped = clampTrimRange(nextStart, nextEnd, duration);
      setTrimStart(clamped.trimStart);
      setTrimEnd(clamped.trimEnd);
    } else {
      let nextEnd = time;
      let nextStart = trimStart;
      if (nextEnd - nextStart > MAX_HIGHLIGHT_CLIP_SECONDS) {
        nextEnd = nextStart + MAX_HIGHLIGHT_CLIP_SECONDS;
      }
      const clamped = clampTrimRange(nextStart, nextEnd, duration);
      setTrimStart(clamped.trimStart);
      setTrimEnd(clamped.trimEnd);
    }
  };

  const endDrag = () => {
    dragRef.current = null;
  };

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
    <div className="grid gap-5">
      <div className="overflow-hidden rounded-2xl border border-white/15 bg-black">
        <video
          ref={videoRef}
          src={objectUrl}
          className="aspect-video w-full bg-black object-contain"
          playsInline
          controls={false}
          onClick={playTrimmedSection}
        />
        <div className="flex items-center justify-between gap-2 border-t border-white/10 bg-cardBg2 px-3 py-2">
          <p className="text-xs text-slate-400">Tap video to play selected clip</p>
          <button
            type="button"
            onClick={playTrimmedSection}
            className="rounded-lg border border-white/15 px-3 py-1 text-xs font-medium text-slate-100"
          >
            Play Clip
          </button>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-white">{readout}</p>
        <div
          ref={trackRef}
          className="relative h-12 select-none rounded-xl border border-white/15 bg-slate-900/80"
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="absolute inset-y-3 left-2 right-2 rounded-full bg-slate-800" />
          <div
            className="absolute inset-y-3 rounded-full bg-teal-500/35"
            style={{ left: `calc(${startPct}% + 8px)`, right: `calc(${100 - endPct}% + 8px)` }}
          />
          <button
            type="button"
            aria-label="Trim start"
            onPointerDown={beginDrag("start")}
            className="absolute top-1/2 z-10 h-9 w-5 -translate-y-1/2 rounded-md border border-teal-300/70 bg-teal-400 shadow"
            style={{ left: `calc(${startPct}% - 10px)` }}
          />
          <button
            type="button"
            aria-label="Trim end"
            onPointerDown={beginDrag("end")}
            className="absolute top-1/2 z-10 h-9 w-5 -translate-y-1/2 rounded-md border border-teal-300/70 bg-teal-400 shadow"
            style={{ left: `calc(${endPct}% - 10px)` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">Drag handles to pick up to 10 seconds.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onChooseDifferent}
          className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-xl border border-white/20 bg-cardBg2 px-4 py-2.5 text-sm font-medium text-slate-100"
        >
          Choose Different Video
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={selectedSpan <= 0}
          className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-xl bg-neonBlue px-4 py-2.5 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-400"
        >
          Use This Clip
        </button>
      </div>
    </div>
  );
}
