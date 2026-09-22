import React from "react";
import CardImage from "./CardImage";
import ExpandableCardView from "./ExpandableCardView";
import HighlightCardPreview from "./HighlightCardPreview";
import QuantitySelector from "./QuantitySelector";
import RarityBadge from "./RarityBadge";
import { StartOverButton } from "./StartOverConfirmModal";
import { rarityDisplayLabel } from "../utils/rarityStyles";

export default function ConfirmCardPanel({
  card,
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
    image_url: "",
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

  return (
    <div className="studio-confirm-panel scroll-focus-target">
      <div className="studio-confirm-card-wrap">
        {isHighlightCardType && highlightClipDraft?.confirmed ? (
          <ExpandableCardView
            showHint
            card={highlightPreviewExpandCard}
            alt="Selected preview"
            localHighlightVideoUrl={highlightClipDraft.objectUrl}
            highlightTrimStart={highlightClipDraft.trimStart ?? 0}
            highlightTrimEnd={highlightClipDraft.trimEnd ?? null}
          >
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
          </ExpandableCardView>
        ) : (
          <ExpandableCardView showHint card={displayCard} alt="Selected preview">
            <CardImage card={displayCard} alt="Selected preview" showInfoBanner={false} />
          </ExpandableCardView>
        )}
      </div>

      <div className="studio-confirm-meta">
        <p className="studio-confirm-player-name">{playerName || playerDisplayName || "Your Player"}</p>
        <div className="studio-confirm-badges">
          <RarityBadge rarity={rarityKey} />
          {rarityKey === "standard" ? (
            <span className="studio-confirm-rarity-label">{rarityLabel || "Base"}</span>
          ) : null}
        </div>
        {tierLabel ? <p className="studio-confirm-tier-label">{tierLabel}</p> : null}
      </div>

      {showFreePreviewNotice ? (
        <p className="studio-confirm-free-notice">This is your free preview</p>
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

      <button
        type="button"
        onClick={onBack}
        className="studio-confirm-back-btn"
      >
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
