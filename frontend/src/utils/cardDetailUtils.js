import { motionLabel } from "../constants/animationMotions";

/** Safe defaults for card detail / display rendering */
export function normalizeCardForDisplay(card) {
  if (!card || typeof card !== "object") return null;

  return {
    ...card,
    tier: card.tier || card.card_tier || "rookie",
    theme: card.theme ?? card.special_theme ?? card.specialTheme ?? "standard",
    rarity: card.rarity || "common",
    player_name: card.player_name ?? card.playerName ?? "",
    team_name: card.team_name ?? card.teamName ?? "",
    position: card.position ?? "",
    jersey_number: card.jersey_number ?? card.jerseyNumber ?? "",
    grad_year: card.grad_year ?? card.gradYear ?? null,
    is_highlight: card.is_highlight === true || card.isHighlight === true,
    is_animated: Boolean(card.is_animated ?? card.isAnimated ?? false),
    highlight_video_url: card.highlight_video_url ?? card.highlightVideoUrl ?? null,
    highlight_thumbnail_url: card.highlight_thumbnail_url ?? card.highlightThumbnailUrl ?? null,
    highlight_trim_start: card.highlight_trim_start ?? card.highlightTrimStart ?? 0,
    highlight_trim_end: card.highlight_trim_end ?? card.highlightTrimEnd ?? null,
    animated_video_url: card.animated_video_url ?? card.animatedVideoUrl ?? null,
    animation_motion: card.animation_motion ?? card.animationMotion ?? null,
    animation_status: card.animation_status ?? card.animationStatus ?? null,
    highlight_status: card.highlight_status ?? card.highlightStatus ?? null,
    edition_number: card.edition_number ?? card.editionNumber ?? 1,
    print_run: card.print_run ?? card.printRun ?? 1,
    status: card.status || "active",
  };
}

export function safeMotionLabel(motionId) {
  if (motionId == null || motionId === "") return "";
  try {
    return motionLabel(motionId);
  } catch {
    return String(motionId).replace(/_/g, " ");
  }
}
