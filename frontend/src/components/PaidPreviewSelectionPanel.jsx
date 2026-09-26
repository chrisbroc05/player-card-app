import React from "react";
import CardImage from "./CardImage";
import { formatMoney } from "../utils/marketplace";

export default function PaidPreviewSelectionPanel({
  previews = [],
  selectedPreviewIndex = null,
  onSelectPreview,
  selectingIndex = null,
  onRepick,
  repickLoading = false,
  repickPurchased = false,
  repickPrice = 1,
  previewToDisplayCard,
  playerDisplayName = "",
  teamName = "",
  orderTier = "rookie",
  specialTheme = null,
}) {
  return (
    <div className="paid-preview-selection">
      <header className="paid-preview-selection__header">
        <h2 className="paid-preview-selection__title">Choose Your Card</h2>
        <p className="paid-preview-selection__subtitle">
          Pick your favorite version — each one is uniquely generated
        </p>
      </header>

      <div className="paid-preview-selection__list">
        {previews.map((preview, index) => {
          const previewIndex = preview.index ?? index;
          const isSelected = selectedPreviewIndex === previewIndex;
          const isSelecting = selectingIndex === previewIndex;
          const displayCard = previewToDisplayCard
            ? previewToDisplayCard(preview)
            : preview;

          return (
            <article
              key={preview.card_id || preview.image_url || `preview-${previewIndex}`}
              className={`paid-preview-selection__item${isSelected ? " paid-preview-selection__item--selected" : ""}`}
            >
              <div className="paid-preview-selection__card-wrap">
                <CardImage
                  card={displayCard}
                  playerName={playerDisplayName}
                  teamName={teamName}
                  tier={orderTier}
                  theme={specialTheme}
                  className="paid-preview-selection__card-image"
                />
              </div>
              <p className="paid-preview-selection__style-label">
                {preview.style_label || `Preview ${previewIndex + 1}`}
              </p>
              <button
                type="button"
                className="btn-primary paid-preview-selection__select-btn"
                disabled={Boolean(selectingIndex)}
                onClick={() => onSelectPreview?.(previewIndex, preview)}
              >
                {isSelecting
                  ? `Locking in ${preview.style_label || "your card"}...`
                  : isSelected
                    ? "Selected"
                    : "Select This Version"}
              </button>
            </article>
          );
        })}
      </div>

      {!repickPurchased ? (
        <div className="paid-preview-selection__repick">
          <button
            type="button"
            className="btn-secondary paid-preview-selection__repick-btn"
            disabled={repickLoading || Boolean(selectingIndex)}
            onClick={onRepick}
          >
            {repickLoading
              ? "Opening checkout..."
              : `Generate Another Version — ${formatMoney(repickPrice)}`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
