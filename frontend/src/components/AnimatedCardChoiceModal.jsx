import React, { useRef } from "react";
import { toApiUrl } from "../config/api";
import { useScrollModalIntoView } from "../hooks/useScrollIntoViewOnChange";

export default function AnimatedCardChoiceModal({
  open,
  previewImageUrl,
  previewAlt = "Your card",
  onAnimate,
  onSaveStatic,
  busy = false,
}) {
  const dialogRef = useRef(null);
  useScrollModalIntoView(open, dialogRef);

  if (!open || !previewImageUrl) return null;

  return (
    <div className="fixed inset-0 z-[58] flex items-end justify-center bg-black/75 p-3 sm:items-center sm:p-4">
      <div
        ref={dialogRef}
        className="scroll-focus-target w-full max-w-md overflow-hidden rounded-2xl border border-violet-400/30 bg-cardBg shadow-2xl sm:max-w-lg"
        role="dialog"
        aria-labelledby="animated-choice-title"
        aria-modal="true"
      >
        <div className="border-b border-white/10 bg-gradient-to-r from-violet-500/15 via-cardBg2 to-neonTeal/10 px-5 py-4 text-center">
          <h2 id="animated-choice-title" className="text-lg font-semibold text-white sm:text-xl">
            Your card is ready — want to animate it?
          </h2>
        </div>

        <div className="px-5 py-5">
          <div className="mx-auto max-w-[200px] overflow-hidden rounded-xl border border-white/15 shadow-lg shadow-black/40">
            <img
              src={toApiUrl(previewImageUrl)}
              alt={previewAlt}
              className="block aspect-[2/3] w-full object-contain bg-black/30"
            />
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={onAnimate}
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50"
            >
              Animate This Card
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onSaveStatic}
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-white/25 bg-transparent px-4 text-sm font-medium text-slate-200 transition hover:border-white/40 hover:bg-white/5 disabled:opacity-50"
            >
              Save as Static Card Instead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
