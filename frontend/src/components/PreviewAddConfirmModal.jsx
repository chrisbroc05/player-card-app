import React from "react";
import CardImage from "./CardImage";

export default function PreviewAddConfirmModal({
  open,
  previewLabel = "this preview",
  card,
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div
      className="preview-add-confirm fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-add-confirm-title"
      onClick={onCancel}
    >
      <div
        className="preview-add-confirm__panel w-full max-w-sm rounded-2xl border border-white/10 bg-cardBg2 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="preview-add-confirm-title" className="text-center text-lg font-semibold text-white">
          Add {previewLabel} to your collection?
        </h2>
        {card ? (
          <div className="preview-add-confirm__thumb mx-auto mt-4 max-w-[140px]">
            <CardImage card={card} alt="Selected preview" showInfoBanner variant="grid" />
          </div>
        ) : null}
        <div className="mt-5 flex flex-col gap-2.5">
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
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-white/15 bg-transparent px-4 py-2 text-sm font-medium text-slate-300 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
