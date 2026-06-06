/** Helpers for animated card UI state */

export function isAnimatedCard(card) {
  if (!card) return false;
  const animated = card.is_animated ?? card.isAnimated;
  const url = card.animated_video_url ?? card.animatedVideoUrl;
  return Boolean(animated && url);
}

export function isAnimationInProgress(card) {
  const st = String(card?.animation_status ?? card?.animationStatus ?? "").toLowerCase();
  return st === "pending" || st === "processing";
}

export function canAnimateCard(card) {
  if (!card || isAnimatedCard(card)) return false;
  const st = card.animation_status ?? card.animationStatus;
  return st == null || st === "failed";
}

export function normalizeAnimationStatus(dataOrStatus) {
  if (dataOrStatus == null) return "";
  if (typeof dataOrStatus === "string") {
    return dataOrStatus.trim().toLowerCase();
  }
  return String(dataOrStatus.status ?? dataOrStatus.animation_status ?? "").toLowerCase();
}

export function animationStatusUserLine(status) {
  const st = normalizeAnimationStatus(status);
  if (st === "pending") return "Queued for generation";
  if (st === "processing") return "Runway AI is working its magic";
  if (st === "completed") return "Finishing up...";
  return "";
}
