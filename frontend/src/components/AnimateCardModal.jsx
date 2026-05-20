import React, { useState } from "react";
import CardImage from "./CardImage";
import MotionSelectionGrid from "./MotionSelectionGrid";

export default function AnimateCardModal({ card, open, onClose, onConfirm, busy }) {
  const [motionId, setMotionId] = useState("");
  const [error, setError] = useState("");

  if (!open || !card) return null;

  function handleConfirm() {
    if (!motionId) {
      setError("Please select a motion.");
      return;
    }
    setError("");
    onConfirm(motionId);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center sm:p-4">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-cardBg p-4 shadow-2xl sm:p-6"
        role="dialog"
        aria-labelledby="animate-modal-title"
      >
        <h3 id="animate-modal-title" className="text-lg font-semibold text-white">
          Bring This Card to Life
        </h3>
        <p className="mt-1 text-sm text-slate-400">{card.player_name}</p>
        <p className="mt-2 text-sm text-slate-300">
          Add AI-generated motion to this card for <span className="font-semibold text-violet-200">$10.00</span>
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Your animated card will be added to your collection as a new card. Your original static card will remain
          unchanged.
        </p>

        <div className="mx-auto mt-4 max-w-[140px]">
          <CardImage card={card} alt={card.player_name} frameClassName="aspect-[2/3] w-full overflow-hidden rounded-lg border border-white/10" />
        </div>

        <div className="mt-5">
          <MotionSelectionGrid compact value={motionId} onChange={setMotionId} error={error} />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={handleConfirm}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Starting…" : "Animate for $10.00"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/20 px-4 text-sm text-slate-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
