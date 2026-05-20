import React from "react";

export default function DeleteCardModal({ card, open, busy, onClose, onConfirm }) {
  if (!open || !card) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center sm:p-4">
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-cardBg p-5 shadow-2xl sm:p-6"
        role="dialog"
        aria-labelledby="delete-card-modal-title"
        aria-modal="true"
      >
        <h3 id="delete-card-modal-title" className="text-lg font-semibold text-white">
          Delete this card?
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          This will permanently delete{" "}
          <span className="font-medium text-white">{card.player_name}</span> ({card.card_id}) from
          your collection. This cannot be undone.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-white/20 px-4 text-sm font-medium text-slate-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50"
          >
            {busy ? "Deleting…" : "Delete Forever"}
          </button>
        </div>
      </div>
    </div>
  );
}
