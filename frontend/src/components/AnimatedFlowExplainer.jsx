import React, { useRef } from "react";
import { useScrollModalIntoView } from "../hooks/useScrollIntoViewOnChange";

export default function AnimatedFlowExplainer({ open, onContinue, motionName = "" }) {
  const dialogRef = useRef(null);
  useScrollModalIntoView(open, dialogRef);

  if (!open) return null;

  return (
    <div className="mobile-bottom-sheet-overlay fixed inset-0 z-[55] flex items-end justify-center bg-black/75 p-3 sm:items-center sm:p-4">
      <div
        ref={dialogRef}
        className="scroll-focus-target w-full max-w-lg overflow-hidden rounded-2xl border border-violet-400/30 bg-gradient-to-b from-violet-500/15 via-cardBg to-cardBg p-5 shadow-2xl shadow-violet-900/30 sm:p-6"
        role="dialog"
        aria-labelledby="animated-flow-explainer-title"
        aria-modal="true"
      >
        <div className="flex items-center gap-2 text-violet-300">
          <span className="text-2xl" aria-hidden>
            ✨
          </span>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-200/90">Animated card journey</p>
        </div>

        <h3 id="animated-flow-explainer-title" className="mt-3 text-xl font-semibold text-white sm:text-2xl">
          Here&apos;s how it works
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-200 sm:text-base">
          First we&apos;ll generate your card art, then our AI will bring it to life with your chosen animation.
          You&apos;ll only receive the animated version in your collection.
        </p>

        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="rounded-xl border border-[var(--color-border-gold)] bg-[var(--color-gold-primary/10] px-3 py-4 text-center">
            <div className="mx-auto flex h-10 w-8 items-center justify-center rounded-md border border-white/15 bg-gradient-to-b from-slate-700 to-slate-900 text-lg">
              🃏
            </div>
            <p className="mt-2 text-xs font-semibold text-brand-gold">Step 1</p>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-300">Generate card art</p>
          </div>

          <div className="text-lg text-violet-300" aria-hidden>
            →
          </div>

          <div className="rounded-xl border border-violet-400/35 bg-violet-500/10 px-3 py-4 text-center">
            <div className="mx-auto flex h-10 w-8 items-center justify-center rounded-md border border-violet-300/30 bg-gradient-to-b from-violet-600/40 to-violet-900/60 text-lg">
              ⚡
            </div>
            <p className="mt-2 text-xs font-semibold text-violet-200">Step 2</p>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-300">AI animation</p>
          </div>
        </div>

        {motionName ? (
          <p className="mt-4 text-center text-sm text-slate-400">
            Your motion: <span className="font-medium text-violet-200">{motionName}</span>
          </p>
        ) : null}

        <button
          type="button"
          onClick={onContinue}
          className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-[var(--color-gold-primary] px-4 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition hover:brightness-105"
        >
          Continue — Let&apos;s Go!
        </button>
      </div>
    </div>
  );
}
