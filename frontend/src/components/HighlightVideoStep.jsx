import React, { useEffect, useRef, useState } from "react";
import { formatMoney } from "../utils/marketplace";
import {
  MAX_HIGHLIGHT_UPLOAD_BYTES,
  cameraAvailable,
  invalidFormatMessage,
  isAcceptedVideoFile,
  loadVideoMetadata,
  tooLargeMessage,
  tooLongMessage,
} from "../utils/highlightVideo";
import HighlightVideoRecorder from "./HighlightVideoRecorder";
import HighlightVideoTrimmer from "./HighlightVideoTrimmer";

const PHASE = {
  CHOOSE: "choose",
  RECORD: "record",
  TRIM: "trim",
  PROCESSING: "processing",
};

export default function HighlightVideoStep({
  highlightCardPrice = 5,
  clipDraft,
  onClipConfirmed,
  onBack,
}) {
  const fileInputRef = useRef(null);
  const [phase, setPhase] = useState(clipDraft?.confirmed ? PHASE.TRIM : PHASE.CHOOSE);
  const [canRecord, setCanRecord] = useState(false);
  const [error, setError] = useState("");
  const [pendingClip, setPendingClip] = useState(clipDraft || null);

  useEffect(() => {
    if (clipDraft?.confirmed) {
      setPendingClip(clipDraft);
      setPhase(PHASE.TRIM);
    }
  }, [clipDraft]);

  useEffect(() => {
    let cancelled = false;
    cameraAvailable().then((available) => {
      if (!cancelled) setCanRecord(available);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (pendingClip?.objectUrl && pendingClip.objectUrl !== clipDraft?.objectUrl) {
        URL.revokeObjectURL(pendingClip.objectUrl);
      }
    };
  }, [pendingClip, clipDraft?.objectUrl]);

  async function handleFileSelected(file) {
    setError("");
    if (!file) return;

    if (!isAcceptedVideoFile(file)) {
      setError(invalidFormatMessage());
      return;
    }
    if (file.size > MAX_HIGHLIGHT_UPLOAD_BYTES) {
      setError(tooLargeMessage());
      return;
    }

    setPhase(PHASE.PROCESSING);
    try {
      const objectUrl = URL.createObjectURL(file);
      const meta = await loadVideoMetadata(file);
      if (meta.duration > 600) {
        URL.revokeObjectURL(objectUrl);
        setError(tooLongMessage());
        setPhase(PHASE.CHOOSE);
        return;
      }
      setPendingClip({
        file,
        objectUrl,
        duration: meta.duration,
        trimStart: 0,
        trimEnd: Math.min(meta.duration, 10),
        confirmed: false,
      });
      setPhase(PHASE.TRIM);
    } catch (err) {
      setError(err.message || "Could not read video file.");
      setPhase(PHASE.CHOOSE);
    }
  }

  function handleRecorded({ file, objectUrl }) {
    setError("");
    setPhase(PHASE.PROCESSING);
    loadVideoMetadata(file)
      .then((meta) => {
        setPendingClip({
          file,
          objectUrl,
          duration: meta.duration,
          trimStart: 0,
          trimEnd: Math.min(meta.duration, 10),
          confirmed: false,
        });
        setPhase(PHASE.TRIM);
      })
      .catch((err) => {
        setError(err.message || "Could not read recording.");
        setPhase(PHASE.RECORD);
      });
  }

  function handleTrimConfirm(draft) {
    onClipConfirmed?.(draft);
  }

  function resetToChoose() {
    if (pendingClip?.objectUrl) URL.revokeObjectURL(pendingClip.objectUrl);
    setPendingClip(null);
    setPhase(PHASE.CHOOSE);
    setError("");
  }

  return (
    <div className="grid gap-5">
      <div>
        <h3 className="text-lg font-semibold text-white">Add Your Highlight Clip</h3>
        <p className="mt-1 text-sm text-slate-400">
          Upload or record your best moment, then trim to 10 seconds. Your clip plays on the card instead of AI
          animation.
        </p>
        <p className="mt-2 text-sm text-teal-200">Highlight upgrade: {formatMoney(highlightCardPrice)}</p>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>
      ) : null}

      {phase === PHASE.PROCESSING ? (
        <div className="rounded-2xl border border-teal-500/35 bg-teal-500/10 px-5 py-8 text-center">
          <p className="text-sm font-medium text-teal-100">Processing your clip...</p>
        </div>
      ) : null}

      {phase === PHASE.CHOOSE ? (
        <>
          <div className={`grid gap-3 ${canRecord ? "sm:grid-cols-2" : ""}`}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-2xl border border-white/15 bg-cardBg2 px-4 py-6 text-center transition hover:border-teal-400/40 hover:bg-teal-500/5"
            >
              <span className="text-2xl">📁</span>
              <span className="text-sm font-semibold text-white">Upload from Camera Roll</span>
              <span className="text-xs text-slate-400">MP4, MOV, WebM, or AVI · max 100 MB</span>
            </button>

            {canRecord ? (
              <button
                type="button"
                onClick={() => setPhase(PHASE.RECORD)}
                className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-2xl border border-white/15 bg-cardBg2 px-4 py-6 text-center transition hover:border-rose-400/40 hover:bg-rose-500/5"
              >
                <span className="text-2xl">🎥</span>
                <span className="text-sm font-semibold text-white">Record Now</span>
                <span className="text-xs text-slate-400">Use your camera · auto-stops at 10s</span>
              </button>
            ) : null}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,video/avi,.mp4,.mov,.webm,.avi"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              handleFileSelected(file);
            }}
          />

          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/20 bg-cardBg2 px-4 py-2.5 text-sm font-medium text-slate-100"
          >
            Back
          </button>
        </>
      ) : null}

      {phase === PHASE.RECORD ? (
        <HighlightVideoRecorder onRecorded={handleRecorded} onCancel={() => setPhase(PHASE.CHOOSE)} />
      ) : null}

      {phase === PHASE.TRIM && pendingClip ? (
        <HighlightVideoTrimmer
          objectUrl={pendingClip.objectUrl}
          file={pendingClip.file}
          duration={pendingClip.duration}
          initialTrimStart={pendingClip.trimStart}
          initialTrimEnd={pendingClip.trimEnd}
          onConfirm={handleTrimConfirm}
          onChooseDifferent={resetToChoose}
        />
      ) : null}
    </div>
  );
}
