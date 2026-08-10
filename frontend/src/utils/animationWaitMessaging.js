/** User-facing copy and timing thresholds for Kling animation generation. */

export const ANIMATION_PRIMARY_HINT =
  "This takes about 2-5 minutes — Kling AI is working hard to make it perfect.";

export const ANIMATION_LONG_WAIT_MS = 3 * 60 * 1000;
export const ANIMATION_EMAIL_HINT_MS = 5 * 60 * 1000;
export const ANIMATION_EMAIL_FALLBACK_MS = 8 * 60 * 1000;

export const ANIMATION_LONG_WAIT_MESSAGE =
  "Taking a bit longer than usual — hang tight, it'll be worth it!";

export const ANIMATION_EMAIL_WAIT_MESSAGE =
  "This is taking longer than expected. You can leave this page — we'll email you when your card is ready!";

export function buildAnimationCyclingMessages(motionName = "") {
  return [
    "Analyzing your player photo...",
    "Generating realistic athletic motion...",
    "Rendering frame by frame...",
    motionName ? `Applying ${motionName} animation...` : "Applying motion animation...",
    "Kling AI is perfecting the details...",
    "Quality takes time — almost there...",
    "Still working — great things take a moment...",
    "Finishing up your animation...",
  ];
}

export function animationExtraWaitMessage(elapsedMs) {
  if (elapsedMs >= ANIMATION_EMAIL_HINT_MS) return ANIMATION_EMAIL_WAIT_MESSAGE;
  if (elapsedMs >= ANIMATION_LONG_WAIT_MS) return ANIMATION_LONG_WAIT_MESSAGE;
  return "";
}
