import React from "react";
import Modal from "./Modal";

export default function PermanentDeleteCardModal({ card, open, busy, onClose, onConfirm }) {
  if (!card) return null;

  return (
    <Modal isOpen={open} onClose={onClose} maxWidth="448px" ariaLabelledby="permanent-delete-card-title">
      <h3 id="permanent-delete-card-title" className="text-lg font-semibold text-white">
        Delete forever?
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        Are you sure? This cannot be undone. Your card and all associated files will be permanently deleted.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className="modal-portal-action inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-white/20 px-4 text-sm font-medium text-slate-300 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className="modal-portal-action inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50"
        >
          {busy ? "Deleting…" : "Yes, Delete Forever"}
        </button>
      </div>
    </Modal>
  );
}
