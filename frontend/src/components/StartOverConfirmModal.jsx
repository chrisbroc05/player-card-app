import React, { useRef } from "react";
import { useScrollModalIntoView } from "../hooks/useScrollIntoViewOnChange";

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 12a8 8 0 0 1 13.66-5.66M20 4v5h-5M20 12a8 8 0 0 1-13.66 5.66M4 20v-5h5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StartOverButton({ onClick, disabled = false, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-transparent px-4 py-2 text-sm font-medium text-slate-400 transition hover:border-white/10 hover:bg-white/5 hover:text-slate-200 disabled:opacity-50 ${className}`}
    >
      <RefreshIcon />
      Start Over
    </button>
  );
}

export default function StartOverConfirmModal({ open, onClose, onConfirm, busy = false }) {
  const dialogRef = useRef(null);
  useScrollModalIntoView(open, dialogRef);

  if (!open) return null;

  return (
    <div className="mobile-bottom-sheet-overlay fixed inset-0 z-[1120] flex items-end justify-center bg-black/75 p-3 sm:items-center sm:p-4">
      <div
        ref={dialogRef}
        className="scroll-focus-target w-full max-w-md rounded-2xl border border-white/10 bg-cardBg p-5 shadow-2xl sm:p-6"
        role="dialog"
        aria-labelledby="start-over-title"
        aria-modal="true"
      >
        <h3 id="start-over-title" className="text-xl font-semibold text-white">
          Start over?
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          This will discard your current card preview. Any credits used for this preview will not be
          refunded.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-amber-400/45 bg-amber-500/10 px-4 text-sm font-semibold text-amber-100 disabled:opacity-50"
          >
            {busy ? "Starting over…" : "Yes, Start Over"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl btn-primary px-4 text-sm font-semibold text-slate-950 disabled:opacity-50"
          >
            Stay on this Page
          </button>
        </div>
      </div>
    </div>
  );
}
