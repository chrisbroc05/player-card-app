import React from "react";
import CardImage from "./CardImage";
import { formatMoney } from "../utils/marketplace";
import { maskCardRarityForSelection } from "../utils/cardDetailUtils";

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
}) {
  const isLockingIn = selectingIndex !== null && selectingIndex !== undefined;

  return (
    <div className="paid-preview-selection">
      <header className="paid-preview-selection__header">
        <h2 className="paid-preview-selection__title">Choose Your Card</h2>
        <p className="paid-preview-selection__subtitle">
          Pick your favorite artwork — your rarity will be revealed after you choose
        </p>
      </header>

      <div className="paid-preview-selection__list">
        {previews.map((preview, index) => {
          const previewIndex = preview.index ?? index;
          const isSelected = selectedPreviewIndex === previewIndex;
          const isSelecting = selectingIndex === previewIndex;
          const rawDisplayCard = previewToDisplayCard
            ? previewToDisplayCard(preview)
            : preview;
          const displayCard = maskCardRarityForSelection(rawDisplayCard);

          return (
            <article
              key={preview.card_id || preview.image_url || `preview-${previewIndex}`}
              className={`paid-preview-selection__item${isSelected ? " paid-preview-selection__item--selected" : ""}`}
            >
              <div className="paid-preview-selection__card-wrap">
                <CardImage
                  card={displayCard}
                  className="paid-preview-selection__card-image"
                  selectionPreviewMode
                  showRarityBadge={false}
                />
              </div>
              <p className="paid-preview-selection__style-label">
                {preview.style_label || `Preview ${previewIndex + 1}`}
              </p>
              <button
                type="button"
                className="btn-primary paid-preview-selection__select-btn"
                disabled={isLockingIn}
                onClick={() => onSelectPreview?.(previewIndex, preview)}
              >
                {isSelecting
                  ? "Locking in your choice..."
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
            disabled={repickLoading || isLockingIn}
            onClick={onRepick}
          >
            {repickLoading
              ? "Opening checkout..."
              : `Generate Another Version — ${formatMoney(repickPrice)}`}
          </button>
        </div>
      ) : null}

      {isLockingIn ? (
        <p className="paid-preview-selection__locking-message" role="status" aria-live="polite">
          Locking in your choice...
        </p>
      ) : null}
    </div>
  );
}
