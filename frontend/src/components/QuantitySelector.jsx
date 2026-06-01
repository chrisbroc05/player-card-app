import React, { useState } from "react";
import { formatMoney } from "../utils/marketplace";
import {
  bulkDiscountMessage,
  copyChargeForQuantity,
  formatCopyTierSummary,
  normalizeCopyTiers,
} from "../utils/copyPricing";

const OPTIONS = [1, 2, 5, 10];

function summaryLine(q) {
  if (q === 1) return "You will receive 1 unique card (#1 of 1) in your collection.";
  if (q === 2) return "You will receive 2 unique cards (#1 of 2 and #2 of 2) in your collection.";
  if (q === 5) return "You will receive 5 unique cards (#1 of 5 through #5 of 5) in your collection.";
  return "You will receive 10 unique cards (#1 of 10 through #10 of 10) in your collection.";
}

function priceHint(q) {
  if (q === 1) return null;
  if (q === 2) return "Best for trading";
  if (q === 5) return "Popular choice";
  return "Best value";
}

export default function QuantitySelector({
  disabled,
  loading,
  onConfirm,
  copyPricingTiers,
  value,
  onChange,
  currentRun = 1,
}) {
  const [internalSelected, setInternalSelected] = useState(1);
  const selected = value !== undefined ? value : internalSelected;
  const setSelected = onChange || setInternalSelected;
  const tiers = normalizeCopyTiers(copyPricingTiers);
  const { extra, unit, total } = copyChargeForQuantity(selected, currentRun, tiers);
  const bulkMsg = bulkDiscountMessage(selected);

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-[#111111]/90 p-4 sm:p-5">
      <h3 className="text-center text-base font-semibold text-white sm:text-left">How many copies do you want?</h3>
      <p className="mt-1 text-center text-sm text-slate-400 sm:text-left">
        Order multiple copies to trade with teammates and friends.
      </p>

      <p className="mt-4 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-center text-xs leading-relaxed text-slate-300 sm:text-left">
        {formatCopyTierSummary(tiers)}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {OPTIONS.map((q) => {
          const isSel = selected === q;
          return (
            <button
              key={q}
              type="button"
              disabled={disabled || loading}
              onClick={() => setSelected(q)}
              className={`relative flex flex-col items-center justify-center rounded-xl border px-2 py-4 text-center transition hover:border-white/25 disabled:opacity-50 ${
                isSel
                  ? "border-2 border-[#ffd700] bg-[#ffd70011]"
                  : "border border-[#2a2a2a] bg-[#1a1a1a]"
              }`}
            >
              <span className={`text-3xl font-extrabold ${isSel ? "text-[#ffd700]" : "text-white"}`}>{q}</span>
              <span className="mt-1 text-[11px] font-medium text-white">{q === 1 ? "copy" : "copies"}</span>
              {q > 1 ? (
                <span className="mt-2 rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-slate-300">
                  Keep 1, trade the rest
                </span>
              ) : null}
              {priceHint(q) ? (
                <span className="mt-2 text-[10px] text-slate-500">{priceHint(q)}</span>
              ) : (
                <span className="mt-2 h-3" aria-hidden />
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-5 text-center text-sm leading-relaxed text-slate-300 sm:text-left">{summaryLine(selected)}</p>

      {bulkMsg ? (
        <p className="mt-3 text-center text-sm font-semibold text-neonTeal sm:text-left">{bulkMsg}</p>
      ) : null}

      <div className="mt-3 rounded-lg border border-white/10 bg-cardBg/80 px-3 py-2.5 text-center text-sm sm:text-left">
        {extra > 0 ? (
          <>
            <span className="text-slate-300">
              {extra} {extra === 1 ? "copy" : "copies"} × {formatMoney(unit)} each ={" "}
            </span>
            <span className="font-semibold tabular-nums text-white">{formatMoney(total)}</span>
            <p className="mt-1 text-xs text-slate-500">First card included from your preview — additional copies only.</p>
          </>
        ) : (
          <span className="text-slate-400">No additional copy charge — first card included.</span>
        )}
      </div>

      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => onConfirm?.(selected)}
        className="mt-6 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#ffd700] to-[#ffaa00] text-sm font-extrabold text-black shadow-lg shadow-black/30 transition hover:brightness-105 disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
            Creating your cards...
          </span>
        ) : (
          "Add to Collection"
        )}
      </button>
    </div>
  );
}
