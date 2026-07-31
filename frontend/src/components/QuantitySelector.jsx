import React, { useEffect, useState } from "react";
import { formatMoney } from "../utils/marketplace";
import {
  bulkDiscountMessage,
  clampCopyQuantity,
  copyChargeForQuantity,
  copyQuantitySummaryLine,
  formatCopyTierSummary,
  isValidCopyQuantity,
  normalizeCopyTiers,
  COPY_QUANTITY_MAX,
  COPY_QUANTITY_MIN,
} from "../utils/copyPricing";

const PRESET_OPTIONS = [1, 2, 5, 10];

function priceHint(q) {
  if (q === 1) return null;
  if (q === 2) return "Best for trading";
  if (q === 5) return "Popular choice";
  if (q === 10) return "Best value";
  return null;
}

export default function QuantitySelector({
  disabled,
  loading,
  onConfirm,
  copyPricingTiers,
  value,
  onChange,
  currentRun = 1,
  confirmLabel = "Add to Collection",
  loadingLabel = "Creating your cards...",
}) {
  const [internalSelected, setInternalSelected] = useState(1);
  const [mode, setMode] = useState("preset");
  const [customInput, setCustomInput] = useState("");

  const selected = value !== undefined ? value : internalSelected;
  const setSelected = onChange || setInternalSelected;

  const tiers = normalizeCopyTiers(copyPricingTiers);
  const effectiveQty =
    mode === "custom" && isValidCopyQuantity(customInput)
      ? clampCopyQuantity(customInput)
      : mode === "custom"
        ? null
        : selected;

  const { extra, unit, total } = effectiveQty
    ? copyChargeForQuantity(effectiveQty, currentRun, tiers)
    : { extra: 0, unit: 0, total: 0 };

  const bulkMsg = effectiveQty ? bulkDiscountMessage(effectiveQty) : null;
  const customError =
    mode === "custom" && customInput !== "" && !isValidCopyQuantity(customInput)
      ? `Please enter a valid quantity (${COPY_QUANTITY_MIN}-${COPY_QUANTITY_MAX})`
      : mode === "custom" && customInput === ""
        ? "Please enter a valid quantity (1-100)"
        : null;

  const canConfirm = effectiveQty !== null && !customError;

  useEffect(() => {
    if (mode !== "preset") return;
    if (!PRESET_OPTIONS.includes(selected)) {
      setMode("custom");
      setCustomInput(String(selected));
    }
  }, [mode, selected]);

  function selectPreset(q) {
    setMode("preset");
    setCustomInput("");
    setSelected(q);
  }

  function selectCustomMode() {
    setMode("custom");
    if (isValidCopyQuantity(customInput)) {
      setSelected(clampCopyQuantity(customInput));
    }
  }

  function handleCustomInputChange(raw) {
    const digits = raw.replace(/\D/g, "");
    setCustomInput(digits);
    if (isValidCopyQuantity(digits)) {
      setSelected(clampCopyQuantity(digits));
    }
  }

  function handleConfirm() {
    if (!canConfirm) return;
    onConfirm?.(effectiveQty);
  }

  const dynamicConfirmLabel =
    extra > 0 ? `${confirmLabel} — ${formatMoney(total)}` : confirmLabel;

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-[#111111]/90 p-4 sm:p-5">
      <h3 className="text-center text-base font-semibold text-white sm:text-left">How many copies do you want?</h3>
      <p className="mt-1 text-center text-sm text-slate-400 sm:text-left">
        Order multiple copies to trade with teammates and friends.
      </p>

      <p className="mt-4 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-center text-xs leading-relaxed text-slate-300 sm:text-left">
        {formatCopyTierSummary(tiers)}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {PRESET_OPTIONS.map((q) => {
          const isSel = mode === "preset" && selected === q;
          return (
            <button
              key={q}
              type="button"
              disabled={disabled || loading}
              onClick={() => selectPreset(q)}
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

        <button
          type="button"
          disabled={disabled || loading}
          onClick={selectCustomMode}
          className={`relative flex flex-col items-center justify-center rounded-xl border px-2 py-4 text-center transition hover:border-white/25 disabled:opacity-50 ${
            mode === "custom"
              ? "border-2 border-[#ffd700] bg-[#ffd70011]"
              : "border border-[#2a2a2a] bg-[#1a1a1a]"
          }`}
        >
          <span className={`text-lg font-extrabold ${mode === "custom" ? "text-[#ffd700]" : "text-white"}`}>
            Custom
          </span>
          <span className="mt-1 text-[11px] font-medium text-white">1–{COPY_QUANTITY_MAX}</span>
        </button>
      </div>

      {mode === "custom" ? (
        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-400" htmlFor="custom-copy-qty">
            Enter quantity
          </label>
          <input
            id="custom-copy-qty"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Enter quantity"
            value={customInput}
            disabled={disabled || loading}
            onChange={(e) => handleCustomInputChange(e.target.value)}
            className={`mt-1.5 min-h-[44px] w-full rounded-xl border bg-cardBg2 px-3 py-2 text-sm text-white placeholder:text-slate-500 ${
              customError ? "border-rose-500/50" : "border-white/15"
            }`}
          />
          {customError ? <p className="mt-1.5 text-xs text-rose-300">{customError}</p> : null}
        </div>
      ) : null}

      {effectiveQty ? (
        <p className="mt-5 text-center text-sm leading-relaxed text-slate-300 sm:text-left">
          {copyQuantitySummaryLine(effectiveQty)}
        </p>
      ) : null}

      {bulkMsg ? (
        <p className="mt-3 text-center text-sm font-semibold text-neonTeal sm:text-left">{bulkMsg}</p>
      ) : null}

      <div className="mt-3 rounded-lg border border-white/10 bg-cardBg/80 px-3 py-2.5 text-center text-sm sm:text-left">
        {effectiveQty && extra > 0 ? (
          <>
            <span className="text-slate-300">
              {extra} {extra === 1 ? "copy" : "copies"} × {formatMoney(unit)} each ={" "}
            </span>
            <span className="font-semibold tabular-nums text-white">{formatMoney(total)}</span>
            <p className="mt-1 text-xs text-slate-500">First card included from your preview — additional copies only.</p>
          </>
        ) : effectiveQty ? (
          <span className="text-slate-400">No additional copy charge — first card included.</span>
        ) : (
          <span className="text-slate-500">Select or enter a quantity to see pricing.</span>
        )}
      </div>

      <button
        type="button"
        disabled={disabled || loading || !canConfirm}
        onClick={handleConfirm}
        className="mt-6 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#ffd700] to-[#ffaa00] text-sm font-extrabold text-black shadow-lg shadow-black/30 transition hover:brightness-105 disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
            {loadingLabel}
          </span>
        ) : (
          dynamicConfirmLabel
        )}
      </button>
    </div>
  );
}
