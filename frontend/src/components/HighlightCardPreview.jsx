import React, { useEffect } from "react";
import CardImage from "./CardImage";
import { buildHighlightPreviewCard } from "../utils/highlightCard";
import { normalizeTierKey } from "../utils/cardTemplate";

/** Browser-only highlight preview using local video blob — no server call. */
export default function HighlightCardPreview({
  playerName,
  teamName,
  position,
  jerseyNumber,
  gradYear,
  tier,
  theme,
  clipDraft,
  variant = "detail",
  frameClassName = "w-full max-w-sm mx-auto",
  forcePlay = true,
  className = "",
}) {
  useEffect(() => {
    console.log("[HighlightCardPreview] tier/theme:", {
      tier,
      theme,
      tierKey: normalizeTierKey(tier),
    });
  }, [tier, theme]);

  if (!clipDraft?.objectUrl) return null;

  const card = buildHighlightPreviewCard({
    playerName,
    teamName,
    position,
    jerseyNumber,
    gradYear,
    tier,
    theme,
    trimStart: clipDraft.trimStart ?? 0,
    trimEnd: clipDraft.trimEnd ?? null,
    objectUrl: clipDraft.objectUrl,
  });

  return (
    <div className={className}>
      <CardImage
        card={card}
        localHighlightVideoUrl={clipDraft.objectUrl}
        highlightTrimStart={clipDraft.trimStart ?? 0}
        highlightTrimEnd={clipDraft.trimEnd ?? null}
        alt={`${playerName} highlight preview`}
        frameClassName={frameClassName}
        variant={variant}
        forcePlay={forcePlay}
        playOnHover={!forcePlay}
        showHighlightBadge
        showInfoBanner
      />
    </div>
  );
}
