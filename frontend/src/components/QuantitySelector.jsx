import React, { useEffect, useMemo, useState } from "react";
import { formatMoney } from "../utils/marketplace";
import {
  bulkDiscountMessage,
  clampCopyQuantity,
  copyChargeForQuantity,
  copyOrderSavings,
  copyQuantityError,
  copyQuantitySummaryLine,
  getCopyTierLabel,
  isCurrentPricingTier,
  isValidCopyQuantity,
  maxCopyTarget,
  normalizeCopyTiers,
  PRICING_TIER_ROWS,
  COPY_QUANTITY_MIN,
} from "../utils/copyPricing";

const PRESET_OPTIONS = [1, 2, 5, 10, 50];

export default function QuantitySelector({
  disabled,
  loading,
  onConfirm,
  copyPricingTiers,
  value,
  onChange,
  currentRun = 1,
  tierBasePrice = 0,
  confirmLabel = "Add to Collection",
  loadingLabel = "Creating your cards...",
  heading = "How many copies do you want?",
  subheading = "Order multiple copies to trade with teammates and friends.",
}) {
  const [internalSelected, setInternalSelected] = useState(1);
  const [mode, setMode] = useState("preset");
  const [customInput, setCustomInput] = useState("");
  const [limitWarning, setLimitWarning] = useState("");

  const selected = value !== undefined ? value : internalSelected;
  const setSelected = onChange || setInternalSelected;
  const maxQty = maxCopyTarget(currentRun);

  const tiers = normalizeCopyTiers(copyPricingTiers);
  const effectiveQty =
    mode === "custom" && isValidCopyQuantity(customInput, currentRun)
      ? clampCopyQuantity(customInput, currentRun)
      : mode === "custom"
        ? null
        : clampCopyQuantity(selected, currentRun);

  const { extra, unit, total } = effectiveQty
    ? copyChargeForQuantity(effectiveQty, currentRun, tiers)
    : { extra: 0, unit: 0, total: 0 };

  const savings = effectiveQty ? copyOrderSavings(effectiveQty, tierBasePrice, tiers) : 0;
  const bulkMsg = effectiveQty ? bulkDiscountMessage(effectiveQty) : null;
  const tierLabel = effectiveQty ? getCopyTierLabel(effectiveQty) : null;

  const customError =
    mode === "custom" && customInput !== "" && !limitWarning
      ? copyQuantityError(customInput, currentRun)
      : mode === "custom" && customInput === "" && !limitWarning
        ? "Please enter a quantity"
        : null;

  const canConfirm = effectiveQty !== null && !customError;

  useEffect(() => {
    if (mode !== "preset") return;
    if (!PRESET_OPTIONS.includes(selected)) {
      setMode("custom");
      setCustomInput(String(selected));
    }
  }, [mode, selected]);

  function applyQuantity(raw, { warn = null } = {}) {
    const clamped = clampCopyQuantity(raw, currentRun);
    setLimitWarning(warn || "");
    setSelected(clamped);
    if (mode === "custom") {
      setCustomInput(String(clamped));
    }
    return clamped;
  }

  function selectPreset(q) {
    setMode("preset");
    setCustomInput("");
    setLimitWarning("");
    setSelected(clampCopyQuantity(q, currentRun));
  }

  function selectCustomMode() {
    setMode("custom");
    if (isValidCopyQuantity(customInput, currentRun)) {
      applyQuantity(customInput);
    }
  }

  function handleCustomInputChange(raw) {
    const digits = raw.replace(/\D/g, "");
    if (digits === "") {
      setCustomInput("");
      setLimitWarning("");
      return;
    }
    const n = Number(digits);
    if (n > maxQty) {
      applyQuantity(maxQty, {
        warn: maxQty === 100 && currentRun <= 1 ? "Maximum 100 copies per order" : `Maximum ${maxQty} copies for this order`,
      });
      return;
    }
    setCustomInput(digits);
    setLimitWarning("");
    if (isValidCopyQuantity(digits, currentRun)) {
      setSelected(clampCopyQuantity(digits, currentRun));
    }
  }

  function handleSliderChange(raw) {
    const n = Number(raw);
    applyQuantity(n);
    if (mode === "custom") {
      setCustomInput(String(clampCopyQuantity(n, currentRun)));
    }
  }

  function handleConfirm() {
    if (!canConfirm) return;
    onConfirm?.(effectiveQty);
  }

  /** Apply server-side limit feedback (from parent after API 400). */
  useEffect(() => {
    if (!value || value === selected) return undefined;
    if (value <= maxQty) {
      setLimitWarning("");
    }
    return undefined;
  }, [value, selected, maxQty]);

  const dynamicConfirmLabel =
    extra > 0 ? `${confirmLabel} — ${formatMoney(total)}` : confirmLabel;

  const pricingRows = useMemo(() => {
    return PRICING_TIER_ROWS.map((row) => {
      const tier = tiers.find((t) => t.min_copies === row.min && t.max_copies === row.max);
      const price =
        row.min === 1
          ? "Included"
          : tier
            ? `${formatMoney(tier.price_per_copy)} each`
            : row.price;
      return { ...row, price };
    });
  }, [tiers]);

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-[#111111]/90 p-4 sm:p-5">
      <p className="copy-quantity-cap-note">
        Maximum 100 copies per order · 50-copy Collector Packs save the most
      </p>

      {effectiveQty >= 50 ? (
        <div className="collector-pack-badge" aria-live="polite">
          COLLECTOR PACK — Best Value
        </div>
      ) : null}

      <h3 className="text-center text-base font-semibold text-white sm:text-left">{heading}</h3>
      <p className="mt-1 text-center text-sm text-slate-400 sm:text-left">{subheading}</p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-6">
        {PRESET_OPTIONS.filter((q) => q <= maxQty).map((q) => {
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
          <span className="mt-1 text-[11px] font-medium text-white">
            {COPY_QUANTITY_MIN}–{maxQty}
          </span>
        </button>
      </div>

      {effectiveQty !== null ? (
        <div className="mt-5">
          <label className="block text-xs font-medium text-slate-400" htmlFor="copy-qty-slider">
            Quantity: {effectiveQty}
            {tierLabel ? ` · ${tierLabel}` : ""}
          </label>
          <input
            id="copy-qty-slider"
            type="range"
            min={COPY_QUANTITY_MIN}
            max={maxQty}
            value={effectiveQty}
            disabled={disabled || loading}
            onChange={(e) => handleSliderChange(e.target.value)}
            className="bulk-list-sheet__slider mt-2 w-full"
          />
        </div>
      ) : null}

      {mode === "custom" ? (
        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-400" htmlFor="custom-copy-qty">
            Enter quantity
          </label>
          <input
            id="custom-copy-qty"
            type="number"
            min={COPY_QUANTITY_MIN}
            max={maxQty}
            inputMode="numeric"
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

      {limitWarning ? (
        <p className="mt-3 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-center text-xs font-medium text-amber-200 sm:text-left">
          {limitWarning}
        </p>
      ) : null}

      <div className="pricing-tiers mt-5">
        <div className="pricing-header">Copy Pricing</div>
        {pricingRows.map((tier) => {
          const active = effectiveQty != null && isCurrentPricingTier(effectiveQty, tier);
          return (
            <div key={tier.range} className={`pricing-tier${active ? " active" : ""}`}>
              <span className="tier-range">{tier.range}</span>
              <span className="tier-label">
                {tier.label}
                {active ? <span className="tier-here"> ← You are here</span> : null}
              </span>
              <span className="tier-price">{tier.price}</span>
            </div>
          );
        })}
      </div>

      {effectiveQty ? (
        <p className="mt-4 text-center text-sm leading-relaxed text-slate-300 sm:text-left">
          {copyQuantitySummaryLine(effectiveQty)}
        </p>
      ) : null}

      {bulkMsg ? (
        <p className="mt-2 text-center text-sm font-semibold text-brand-gold sm:text-left">{bulkMsg}</p>
      ) : null}

      <div className="copy-order-summary mt-4 rounded-lg border border-white/10 bg-cardBg/80 px-3 py-3 text-sm">
        <p className="font-semibold text-white">Order Summary</p>
        {effectiveQty ? (
          <ul className="mt-2 space-y-1.5 text-slate-300">
            <li className="flex justify-between gap-3">
              <span>1 card (included)</span>
              <span className="text-slate-400">
                {tierBasePrice > 0 ? formatMoney(tierBasePrice) : "Included"}
              </span>
            </li>
            {extra > 0 ? (
              <li className="flex justify-between gap-3">
                <span>
                  {extra} additional {extra === 1 ? "copy" : "copies"} at {formatMoney(unit)} each
                </span>
                <span className="font-medium tabular-nums text-white">{formatMoney(total)}</span>
              </li>
            ) : null}
            <li className="flex justify-between gap-3 border-t border-white/10 pt-2 font-semibold text-white">
              <span>Total</span>
              <span className="tabular-nums text-brand-gold">{formatMoney(total)}</span>
            </li>
          </ul>
        ) : (
          <p className="mt-2 text-slate-500">Select or enter a quantity to see pricing.</p>
        )}
        {savings > 0 ? (
          <p className="mt-2 text-xs font-medium text-brand-gold">
            You save {formatMoney(savings)} vs buying individually
          </p>
        ) : null}
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
