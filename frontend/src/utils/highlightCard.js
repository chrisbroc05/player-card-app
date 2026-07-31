/** Helpers for highlight card UI state */

import { isAnimatedCard } from "./animationCard";
import {
  CARD_IMAGE_FRAME,
  CARD_IMAGE_FRAME_ANIMATED,
  CARD_IMAGE_FRAME_THUMB,
  CARD_IMAGE_FRAME_THUMB_ANIMATED,
} from "./cardImageStyles";

export function highlightVideoUrl(card, localVideoUrl = "") {
  if (localVideoUrl) return localVideoUrl;
  if (!card) return "";
  return card.highlight_video_url ?? card.highlightVideoUrl ?? "";
}

export function isHighlightType(card) {
  if (!card) return false;
  return Boolean(card.is_highlight ?? card.isHighlight);
}

export function isHighlightCard(card, { localVideoUrl = "" } = {}) {
  if (!card && !localVideoUrl) return false;
  const url = highlightVideoUrl(card, localVideoUrl);
  if (!url) return false;

  const highlight = isHighlightType(card) || Boolean(localVideoUrl);
  if (highlight) return true;

  const status = String(card?.highlight_status ?? card?.highlightStatus ?? "").toLowerCase();
  return status === "completed" || status === "preview";
}

export function isHighlightInProgress(card) {
  if (!card) return false;
  const st = String(card.highlight_status ?? card.highlightStatus ?? "").toLowerCase();
  if (st === "processing") return true;
  if (isHighlightType(card) && !highlightVideoUrl(card) && st !== "failed") return true;
  return false;
}

export function cardPlaysVideoOnHover(card) {
  return isAnimatedCard(card) || isHighlightCard(card);
}

export function cardMediaFrameClass(card, { thumb = false } = {}) {
  if (isAnimatedCard(card)) {
    return thumb ? CARD_IMAGE_FRAME_THUMB_ANIMATED : CARD_IMAGE_FRAME_ANIMATED;
  }
  if (isHighlightCard(card) || isHighlightType(card)) {
    return thumb ? CARD_IMAGE_FRAME_THUMB : CARD_IMAGE_FRAME;
  }
  return thumb ? CARD_IMAGE_FRAME_THUMB : CARD_IMAGE_FRAME;
}

export function buildHighlightPreviewCard({
  playerName,
  teamName,
  position,
  jerseyNumber,
  gradYear,
  tier,
  theme,
  cardId = "PREVIEW",
  trimStart = 0,
  trimEnd = null,
  objectUrl = "",
}) {
  return {
    card_id: cardId,
    player_name: playerName,
    team_name: teamName,
    position,
    jersey_number: jerseyNumber,
    grad_year: gradYear,
    tier,
    theme,
    special_theme: theme,
    is_highlight: true,
    highlight_status: "preview",
    highlight_video_url: objectUrl,
    highlight_trim_start: trimStart,
    highlight_trim_end: trimEnd,
    edition_number: 1,
    print_run: 1,
  };
}
