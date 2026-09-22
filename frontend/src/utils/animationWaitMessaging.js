/** User-facing copy and timing thresholds for Kling animation generation. */

export const ANIMATION_PRIMARY_HINT =
  "Usually 2–5 minutes. Kling AI is on it.";

export const ANIMATION_LONG_WAIT_MS = 3 * 60 * 1000;
export const ANIMATION_FAILURE_TIMEOUT_MS = 3 * 60 * 1000;
export const ANIMATION_EMAIL_HINT_MS = 5 * 60 * 1000;
export const ANIMATION_EMAIL_FALLBACK_MS = 8 * 60 * 1000;

export const ANIMATION_LONG_WAIT_MESSAGE =
  "Taking a bit longer — hang tight!";

export const ANIMATION_EMAIL_WAIT_MESSAGE =
  "Still working. Leave this page — we'll email you when it's ready.";

export function buildAnimationCyclingMessages(motionName = "") {
  const motionLine = motionName
    ? `Applying ${String(motionName).slice(0, 22)} motion...`
    : "Applying motion animation...";
  return [
    "Analyzing your player photo...",
    "Generating athletic motion...",
    "Rendering frame by frame...",
    motionLine,
    "Kling AI is on the details...",
    "Quality takes time — almost there",
    "Still working — almost there",
    "Finishing your animation...",
  ];
}

export function animationExtraWaitMessage(elapsedMs) {
  if (elapsedMs >= ANIMATION_EMAIL_HINT_MS) return ANIMATION_EMAIL_WAIT_MESSAGE;
  if (elapsedMs >= ANIMATION_LONG_WAIT_MS) return ANIMATION_LONG_WAIT_MESSAGE;
  return "";
}
