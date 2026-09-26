import React from "react";
import ListingModal from "./ListingModal";
import MarketplaceCopyTile from "./MarketplaceCopyTile";

export default function MarketplaceCopyPicker({
  open,
  mode = "single",
  copies = [],
  printRun = 1,
  selectedCardId,
  selectedCardIds = [],
  onSelect,
  onToggle,
  onContinue,
  onBack,
  onClose,
  busy = false,
}) {
  if (!open || copies.length === 0) return null;

  const total = Number(printRun) || Number(copies[0]?.print_run) || copies.length;
  const isMulti = mode === "multi";
  const selectedSet = new Set(selectedCardIds);
  const canContinue = isMulti ? selectedSet.size > 0 : Boolean(selectedCardId);

  return (
    <ListingModal
      isOpen={open}
      onClose={onClose}
      ariaLabelledby="marketplace-copy-picker-title"
      debugLabel={isMulti ? "marketplace-copy-multi-picker" : "marketplace-copy-picker"}
    >
      <div className="listing-modal-body marketplace-copy-picker">
        <button type="button" className="bulk-list-sheet__close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2 id="marketplace-copy-picker-title" className="bulk-list-sheet__title">
          {isMulti ? "Select copies to list" : "Which copy do you want to list?"}
        </h2>
        <p className="bulk-list-sheet__subtext">
          {isMulti
            ? "Pick any combination. Each selected copy will get its own listing at the same price."
            : "Choose the specific copy you're putting up for sale."}
        </p>

        <div
          className="marketplace-copy-picker__grid"
          role={isMulti ? "group" : "listbox"}
          aria-label="Available copies"
        >
          {copies.map((copy) => {
            const isSelected = isMulti ? selectedSet.has(copy.card_id) : copy.card_id === selectedCardId;

            return (
              <MarketplaceCopyTile
                key={copy.card_id}
                copy={copy}
                printRun={total}
                selected={isSelected}
                showCheckbox={isMulti}
                disabled={busy}
                onClick={() => {
                  if (isMulti) {
                    onToggle?.(copy.card_id);
                  } else {
                    onSelect?.(copy.card_id);
                  }
                }}
              />
            );
          })}
        </div>

        <button
          type="button"
          className="bulk-list-sheet__primary-btn listing-modal-action marketplace-copy-picker__continue"
          disabled={!canContinue || busy}
          onClick={onContinue}
        >
          Continue
        </button>
        {onBack ? (
          <button
            type="button"
            className="bulk-list-sheet__secondary-btn listing-modal-action"
            disabled={busy}
            onClick={onBack}
          >
            Back
          </button>
        ) : (
          <button
            type="button"
            className="bulk-list-sheet__secondary-btn listing-modal-action"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
        )}
      </div>
    </ListingModal>
  );
}
