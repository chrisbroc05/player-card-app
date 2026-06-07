import React, { useState } from "react";
import { Link } from "react-router-dom";
import { formatMoney } from "../utils/marketplace";
import {
  animatedStudioBreakdown,
  animatedStudioPriceLine,
  animatedStudioTotalPrice,
} from "../utils/animatedCopyPricing";
import { useScrollModalIntoView } from "../hooks/useScrollIntoViewOnChange";

const OPTIONS = [1, 2, 3, 4, 5, 10];

export default function AnimatedQuantityModal({
  open,
  onClose,
  onConfirm,
  busy = false,
  generationPricing,
  creditBalance = 0,
  previewImageUrl = "",
  previewAlt = "Your card",
}) {
  const [selected, setSelected] = useState(1);
  const dialogRef = React.useRef(null);
  useScrollModalIntoView(open, dialogRef);

  React.useEffect(() => {
    if (open) setSelected(1);
  }, [open]);

  if (!open) return null;

  const pricing = animatedStudioTotalPrice(selected, generationPricing || {});
  const canAfford = creditBalance >= pricing.total;
  const shortfall = Math.max(0, pricing.total - creditBalance);

  return (
    <div className="fixed inset-0 z-[59] flex items-end justify-center bg-black/75 p-3 sm:items-center sm:p-4">
      <div
        ref={dialogRef}
        className="scroll-focus-target max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-violet-400/30 bg-cardBg shadow-2xl"
        role="dialog"
        aria-labelledby="animated-qty-title"
        aria-modal="true"
      >
        <div className="border-b border-white/10 bg-gradient-to-r from-violet-500/15 via-cardBg2 to-neonTeal/10 px-5 py-4">
          <h2 id="animated-qty-title" className="text-lg font-semibold text-white">
            How many animated copies would you like?
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            First copy is included in the base price. Additional copies are billed before animation starts.
          </p>
        </div>

        <div className="px-5 py-5">
          {previewImageUrl ? (
            <div className="mx-auto mb-5 max-w-[120px] overflow-hidden rounded-lg border border-white/15">
              <img
                src={previewImageUrl}
                alt={previewAlt}
                className="block aspect-[2/3] w-full object-contain bg-black/30"
              />
            </div>
          ) : null}

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {OPTIONS.map((q) => {
              const isSel = selected === q;
              return (
                <button
                  key={q}
                  type="button"
                  disabled={busy}
                  onClick={() => setSelected(q)}
                  className={`flex flex-col items-center rounded-xl border px-2 py-3 transition disabled:opacity-50 ${
                    isSel
                      ? "border-violet-400/60 bg-violet-500/15 text-violet-100"
                      : "border-white/15 bg-cardBg2 text-slate-300 hover:border-white/25"
                  }`}
                >
                  <span className="text-2xl font-bold">{q}</span>
                  <span className="mt-0.5 text-[10px] uppercase tracking-wide">{q === 1 ? "copy" : "copies"}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 rounded-xl border border-white/10 bg-cardBg2 px-4 py-3 text-sm">
            <p className="font-semibold text-white">{animatedStudioPriceLine(selected, generationPricing || {})}</p>
            <p className="mt-1 text-slate-400">{animatedStudioBreakdown(selected, generationPricing || {})}</p>
            <p className="mt-2 text-xs text-slate-500">
              1 copy included in base · 2–4 copies: {formatMoney(generationPricing?.animated_copy_pricing?.additional_2_to_4 ?? 2)} each ·
              5+ copies: {formatMoney(generationPricing?.animated_copy_pricing?.additional_5_plus ?? 1.5)} each additional
            </p>
          </div>

          {!canAfford ? (
            <div className="mt-4 rounded-xl border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              <p>You need {formatMoney(shortfall)} more to continue.</p>
              <Link
                to="/credits"
                className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-neonTeal px-4 text-sm font-semibold text-slate-950"
              >
                Add Credits
              </Link>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl border border-white/20 px-4 text-sm font-medium text-slate-300 disabled:opacity-50"
            >
              Go Back
            </button>
            {canAfford ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onConfirm?.(selected)}
                className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50"
              >
                {busy
                  ? "Processing…"
                  : `Confirm & Pay ${formatMoney(pricing.total)}`}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
