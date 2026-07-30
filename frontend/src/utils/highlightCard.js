/** Helpers for highlight card UI state */

import { isAnimatedCard } from "./animationCard";
import {
  CARD_IMAGE_FRAME,
  CARD_IMAGE_FRAME_ANIMATED,
  CARD_IMAGE_FRAME_HIGHLIGHT,
  CARD_IMAGE_FRAME_THUMB,
  CARD_IMAGE_FRAME_THUMB_ANIMATED,
  CARD_IMAGE_FRAME_THUMB_HIGHLIGHT,
} from "./cardImageStyles";

export function isHighlightCard(card) {
  if (!card) return false;
  const highlight = card.is_highlight ?? card.isHighlight;
  const url = card.highlight_video_url ?? card.highlightVideoUrl;
  const status = String(card.highlight_status ?? card.highlightStatus ?? "").toLowerCase();
  return Boolean(highlight && url && status === "completed");
}

export function isHighlightInProgress(card) {
  const st = String(card?.highlight_status ?? card?.highlightStatus ?? "").toLowerCase();
  return st === "processing";
}

export function cardPlaysVideoOnHover(card) {
  return isAnimatedCard(card) || isHighlightCard(card);
}

export function cardMediaFrameClass(card, { thumb = false } = {}) {
  if (isAnimatedCard(card)) {
    return thumb ? CARD_IMAGE_FRAME_THUMB_ANIMATED : CARD_IMAGE_FRAME_ANIMATED;
  }
  if (isHighlightCard(card)) {
    return thumb ? CARD_IMAGE_FRAME_THUMB_HIGHLIGHT : CARD_IMAGE_FRAME_HIGHLIGHT;
  }
  return thumb ? CARD_IMAGE_FRAME_THUMB : CARD_IMAGE_FRAME;
}
