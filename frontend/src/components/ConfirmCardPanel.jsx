import React, { useEffect, useState } from "react";
import HighlightCardPreview from "./HighlightCardPreview";
import QuantitySelector from "./QuantitySelector";
import { StartOverButton } from "./StartOverConfirmModal";
import { toApiUrl } from "../config/api";
import { rarityDisplayLabel } from "../utils/rarityStyles";

function CardIconPlaceholder() {
  return (
    <svg
      className="studio-confirm-card-fallback__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 14l2.5-2.5L13 14l2-2 3 3" />
      <circle cx="9" cy="8" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function ConfirmCardPanel({
  card,
  imageUrl,
  playerName,
  tierLabel,
  isHighlightCardType,
  highlightClipDraft,
  highlightPreviewExpandCard,
  playerDisplayName,
  teamName,
  position,
  jerseyNumber,
  gradYear,
  orderTier,
  specialTheme,
  showFreePreviewNotice,
  copyQuantity,
  setCopyQuantity,
  copyPricingTiers,
  additionalPreviewCost,
  addCollectionLoading,
  orderActionBusy,
  startOverBusy,
  onConfirm,
  onBack,
  onStartOver,
}) {
  const displayCard = card || {
    image_url: imageUrl || "",
    player_name: playerDisplayName,
    team_name: teamName,
    position,
    jersey_number: jerseyNumber,
    grad_year: gradYear,
    tier: orderTier || "rookie",
    theme: specialTheme,
    special_theme: specialTheme,
  };

  const rarityKey = displayCard.rarity || "standard";
  const rarityLabel = displayCard.rarity_display_name || rarityDisplayLabel(rarityKey);
  const tierRarityLine = [tierLabel, rarityLabel].filter(Boolean).join(" — ");

  const resolvedImageUrl = (imageUrl || displayCard.image_url || "").trim();
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [resolvedImageUrl]);

  const showHighlightPreview = isHighlightCardType && highlightClipDraft?.confirmed;
  const showImage = Boolean(resolvedImageUrl) && !imgFailed && !showHighlightPreview;

  return (
    <div className="studio-confirm-panel scroll-focus-target">
      <div className="studio-confirm-card-wrap">
        {showHighlightPreview ? (
          <div className="studio-confirm-card-media studio-confirm-card-media--highlight">
            <HighlightCardPreview
              playerName={playerDisplayName}
              teamName={teamName}
              position={position}
              jerseyNumber={jerseyNumber}
              gradYear={gradYear}
              tier={orderTier}
              theme={specialTheme}
              clipDraft={highlightClipDraft}
              forcePlay
            />
          </div>
        ) : showImage ? (
          <img
            className="studio-confirm-card-media"
            src={toApiUrl(resolvedImageUrl)}
            alt={playerName || playerDisplayName || "Generated card preview"}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="studio-confirm-card-fallback" role="img" aria-label="Card preview unavailable">
            <CardIconPlaceholder />
            <span className="studio-confirm-card-fallback__label">Card preview</span>
          </div>
        )}
      </div>

      <div className="studio-confirm-meta">
        <p className="studio-confirm-player-name">{playerName || playerDisplayName || "Your Player"}</p>
        {tierRarityLine ? <p className="studio-confirm-tier-rarity">{tierRarityLine}</p> : null}
      </div>

      {showFreePreviewNotice ? (
        <p className="studio-confirm-free-notice">✓ Free Preview</p>
      ) : null}

      <QuantitySelector
        disabled={addCollectionLoading}
        loading={addCollectionLoading}
        copyPricingTiers={copyPricingTiers}
        tierBasePrice={additionalPreviewCost}
        value={copyQuantity}
        onChange={setCopyQuantity}
        onConfirm={onConfirm}
        confirmLabel="Add to Collection"
        loadingLabel="Creating your cards..."
        heading="How many copies do you want?"
        subheading="Order multiple copies to trade with teammates and friends."
      />

      <button type="button" onClick={onBack} className="studio-confirm-back-btn">
        ← Back
      </button>

      <div className="studio-confirm-start-over">
        <StartOverButton
          onClick={onStartOver}
          disabled={startOverBusy || addCollectionLoading || orderActionBusy}
        />
      </div>
    </div>
  );
}
