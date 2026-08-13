import React, { useCallback, useEffect, useRef, useState } from "react";
import { MAX_HIGHLIGHT_CLIP_SECONDS, pickRecorderMimeType } from "../utils/highlightVideo";

const RECORD_SECONDS = MAX_HIGHLIGHT_CLIP_SECONDS;

export default function HighlightVideoRecorder({ onRecorded, onCancel }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const autoStopRef = useRef(null);

  const [phase, setPhase] = useState("preview"); // preview | recording | recorded | denied | error
  const [countdown, setCountdown] = useState(RECORD_SECONDS);
  const [recordedUrl, setRecordedUrl] = useState("");
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setErrorMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setPhase("preview");
    } catch (err) {
      stopStream();
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setPhase("denied");
        return;
      }
      setPhase("error");
      setErrorMessage("Could not access camera. Please upload a video instead.");
    }
  }, [stopStream]);

  useEffect(() => {
    startCamera();
    return () => {
      clearTimers();
      stopStream();
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishRecording = useCallback(() => {
    clearTimers();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }, [clearTimers]);

  const handleStartRecording = () => {
    if (!streamRef.current || phase === "recording") return;
    const mimeType = pickRecorderMimeType();
    if (!mimeType) {
      setPhase("error");
      setErrorMessage("Recording is not supported in this browser. Please upload a video instead.");
      return;
    }

    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `highlight-recording.${ext}`, { type: mimeType });
      const url = URL.createObjectURL(blob);
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(url);
      setRecordedBlob(file);
      setPhase("recorded");
      stopStream();
    };

    recorder.start(250);
    setPhase("recording");
    setCountdown(RECORD_SECONDS);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    autoStopRef.current = setTimeout(() => {
      finishRecording();
    }, RECORD_SECONDS * 1000);
  };

  const handleReRecord = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl("");
    setRecordedBlob(null);
    setCountdown(RECORD_SECONDS);
    startCamera();
  };

  const handleUseRecording = () => {
    if (!recordedBlob) return;
    onRecorded?.({ file: recordedBlob, objectUrl: recordedUrl });
  };

  if (phase === "denied") {
    return (
      <div className="grid gap-4">
        <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-5 text-center">
          <p className="text-sm font-medium text-amber-100">Camera access denied — please upload a video instead</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/20 bg-cardBg2 px-4 py-2.5 text-sm font-medium text-slate-100"
        >
          Back to Upload Options
        </button>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="grid gap-4">
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {errorMessage}
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/20 bg-cardBg2 px-4 py-2.5 text-sm font-medium text-slate-100"
        >
          Back to Upload Options
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="relative mx-auto aspect-[9/16] w-full max-w-sm overflow-hidden rounded-2xl border border-white/15 bg-black">
        {phase === "recorded" && recordedUrl ? (
          <video src={recordedUrl} className="h-full w-full object-cover" controls playsInline />
        ) : (
          <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted playsInline />
        )}

        {phase === "recording" ? (
          <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-rose-200">
            REC · {countdown}s
          </div>
        ) : null}
      </div>

      {phase === "recorded" ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleReRecord}
            className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-xl border border-white/20 bg-cardBg2 px-4 py-2.5 text-sm font-medium text-slate-100"
          >
            Re-record
          </button>
          <button
            type="button"
            onClick={handleUseRecording}
            className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-xl btn-primary px-4 py-2.5 text-sm font-medium text-slate-950"
          >
            Continue to Trim
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={phase === "recording" ? finishRecording : handleStartRecording}
            aria-label={phase === "recording" ? "Stop recording" : "Start recording"}
            className={`flex h-16 w-16 items-center justify-center rounded-full border-4 ${
              phase === "recording" ? "border-white bg-rose-600" : "border-rose-300 bg-rose-500"
            }`}
          >
            <span className={`block rounded-sm ${phase === "recording" ? "h-5 w-5 bg-white" : "h-6 w-6 rounded-full bg-white"}`} />
          </button>
          <p className="text-xs text-slate-400">
            {phase === "recording"
              ? "Tap to stop · auto-stops at 10 seconds"
              : "Tap to record · max 10 seconds"}
          </p>
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
          >
            Back to Upload Options
          </button>
        </div>
      )}
    </div>
  );
}
