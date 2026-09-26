import React from "react";
import { toApiUrl } from "../config/api";
import { formatBannerEdition } from "../utils/cardBannerStyles";

export function copyListingLabel(copy, printRun) {
  const edition = Number(copy?.edition_number) || 1;
  const total = Number(printRun) || Number(copy?.print_run) || 1;
  const base = formatBannerEdition(edition, total);
  if (edition === 1 && total > 1) {
    return `${base} — Original`;
  }
  return base;
}

export default function MarketplaceCopyTile({
  copy,
  printRun = 1,
  selected = false,
  showCheckbox = false,
  readOnly = false,
  onClick,
  disabled = false,
}) {
  const edition = Number(copy?.edition_number) || 1;
  const isOriginal = edition === 1;
  const label = copyListingLabel(copy, printRun);
  const className = `marketplace-copy-picker__option${selected ? " marketplace-copy-picker__option--selected" : ""}${readOnly ? " marketplace-copy-picker__option--readonly" : ""}`;
  const inner = (
    <>
      {showCheckbox ? (
        <span
          className={`marketplace-copy-picker__checkbox${selected ? " marketplace-copy-picker__checkbox--checked" : ""}`}
          aria-hidden
        >
          {selected ? "✓" : ""}
        </span>
      ) : null}
      <div
        className={`marketplace-copy-picker__thumb${isOriginal ? " marketplace-copy-picker__thumb--gold" : " marketplace-copy-picker__thumb--dark"}`}
      >
        {copy.image_url ? (
          <img src={toApiUrl(copy.image_url)} alt="" loading="lazy" />
        ) : (
          <div className="marketplace-copy-picker__thumb-placeholder" aria-hidden />
        )}
      </div>
      <span
        className={`marketplace-copy-picker__label${isOriginal ? " marketplace-copy-picker__label--gold" : ""}`}
      >
        {label}
      </span>
    </>
  );

  if (readOnly) {
    return <div className={className}>{inner}</div>;
  }

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      className={className}
      onClick={onClick}
    >
      {inner}
    </button>
  );
}
