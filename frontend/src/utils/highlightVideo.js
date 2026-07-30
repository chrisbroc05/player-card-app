export const MAX_HIGHLIGHT_CLIP_SECONDS = 10;
export const MAX_HIGHLIGHT_UPLOAD_SECONDS = 600;
export const MAX_HIGHLIGHT_UPLOAD_BYTES = 100 * 1024 * 1024;

const ACCEPTED_EXTENSIONS = new Set([".mp4", ".mov", ".webm", ".avi"]);
const ACCEPTED_MIME_PREFIXES = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo", "video/avi"];

export function formatHighlightTime(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(total / 60);
  const secs = Math.floor(total % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function fileExtension(name) {
  const idx = (name || "").lastIndexOf(".");
  return idx >= 0 ? name.slice(idx).toLowerCase() : "";
}

export function isAcceptedVideoFile(file) {
  if (!file) return false;
  const ext = fileExtension(file.name);
  if (ACCEPTED_EXTENSIONS.has(ext)) return true;
  const type = (file.type || "").toLowerCase();
  return ACCEPTED_MIME_PREFIXES.some((prefix) => type.startsWith(prefix.split(";")[0]));
}

export function invalidFormatMessage() {
  return "Please upload a valid video file (MP4, MOV, WebM, or AVI).";
}

export function tooLargeMessage() {
  return "Video file is too large (max 100 MB).";
}

export function tooLongMessage() {
  return (
    "Please upload a shorter video. Maximum upload is 10 minutes — " +
    "then trim to your best 10 seconds."
  );
}

export function initialTrimRange(duration) {
  const safeDuration = Math.max(0, Number(duration) || 0);
  if (safeDuration <= MAX_HIGHLIGHT_CLIP_SECONDS) {
    return { trimStart: 0, trimEnd: safeDuration };
  }
  return { trimStart: 0, trimEnd: MAX_HIGHLIGHT_CLIP_SECONDS };
}

export function clampTrimRange(trimStart, trimEnd, duration, maxSpan = MAX_HIGHLIGHT_CLIP_SECONDS) {
  const safeDuration = Math.max(0, Number(duration) || 0);
  let start = Math.max(0, Math.min(trimStart, safeDuration));
  let end = Math.max(0, Math.min(trimEnd, safeDuration));
  if (end <= start) {
    end = Math.min(safeDuration, start + 0.5);
  }
  if (end - start > maxSpan) {
    end = start + maxSpan;
  }
  if (end > safeDuration) {
    end = safeDuration;
    start = Math.max(0, end - maxSpan);
  }
  return { trimStart: start, trimEnd: end };
}

export function loadVideoMetadata(source) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.playsInline = true;
    video.muted = true;

    const url = typeof source === "string" ? source : URL.createObjectURL(source);
    const shouldRevoke = typeof source !== "string";

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
      if (shouldRevoke) URL.revokeObjectURL(url);
    };

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      cleanup();
      resolve({ duration, width: video.videoWidth, height: video.videoHeight });
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("Could not read video file."));
    };
    video.src = url;
  });
}

export async function cameraAvailable() {
  if (!navigator.mediaDevices?.getUserMedia) return false;
  if (!window.MediaRecorder) return false;
  try {
    if (navigator.mediaDevices.enumerateDevices) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some((d) => d.kind === "videoinput");
    }
    return true;
  } catch {
    return false;
  }
}

export function pickRecorderMimeType() {
  const candidates = [
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  if (typeof MediaRecorder === "undefined") return "";
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || "";
}
