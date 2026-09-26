import React from "react";
import ListingModal from "./ListingModal";

export default function MarketplaceListingModeChooser({
  open,
  onClose,
  onChooseSingle,
  onChooseMultiple,
  busy = false,
}) {
  if (!open) return null;

  return (
    <ListingModal
      isOpen={open}
      onClose={onClose}
      ariaLabelledby="marketplace-list-mode-title"
      debugLabel="marketplace-list-mode"
    >
      <div className="listing-modal-body marketplace-list-mode">
        <button type="button" className="bulk-list-sheet__close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2 id="marketplace-list-mode-title" className="bulk-list-sheet__title">
          List on Marketplace
        </h2>
        <p className="bulk-list-sheet__subtext">
          Choose whether to list one copy at its own price, or several copies at the same price.
        </p>

        <div className="marketplace-list-mode__actions">
          <button
            type="button"
            className="bulk-list-sheet__primary-btn listing-modal-action"
            disabled={busy}
            onClick={onChooseSingle}
          >
            List One Copy
          </button>
          <button
            type="button"
            className="bulk-list-sheet__secondary-btn listing-modal-action marketplace-list-mode__secondary"
            disabled={busy}
            onClick={onChooseMultiple}
          >
            List Multiple Copies
          </button>
        </div>
      </div>
    </ListingModal>
  );
}
