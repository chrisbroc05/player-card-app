import React from "react";
import CardImage from "./CardImage";
import RarityBadge from "./RarityBadge";
import { rarityDisplayLabel } from "../utils/rarityStyles";

export default function PreviewAddConfirmModal({
  open,
  previewLabel = "this preview",
  card,
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  const rarityLabel = card?.rarity_display_name || rarityDisplayLabel(card?.rarity);
  const templateName = card?.template_name || "";

  return (
    <div
      className="add-confirmation-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-add-confirm-title"
      onClick={onCancel}
    >
      <div className="add-confirmation-box" onClick={(e) => e.stopPropagation()}>
        {card ? (
          <div className="add-confirmation-box__thumb confirmation-card-thumbnail">
            <CardImage card={card} alt="Selected preview" showInfoBanner variant="grid" />
          </div>
        ) : null}
        <h2 id="preview-add-confirm-title" className="add-confirmation-box__title">
          Add this card to your collection?
        </h2>
        {card ? (
          <div className="add-confirmation-box__meta">
            {rarityLabel ? <RarityBadge rarity={card.rarity} size="default" /> : null}
            {templateName ? <span className="add-confirmation-box__template">{templateName}</span> : null}
          </div>
        ) : null}
        <div className="add-confirmation-box__actions">
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl btn-primary px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50"
          >
            {loading ? "Adding…" : "Yes, Add to Collection"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-white/20 bg-transparent px-4 py-2 text-sm font-medium text-slate-300 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
