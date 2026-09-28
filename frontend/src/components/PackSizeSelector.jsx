import React, { useEffect, useMemo, useState } from "react";
import {
  clampCopyQuantity,
  copyQuantityError,
  isValidCopyQuantity,
  maxCopyTarget,
  COPY_QUANTITY_MIN,
} from "../utils/copyPricing";

const PRESET_OPTIONS = [
  { value: 1, label: "1" },
  { value: 5, label: "5 Pack" },
  { value: 10, label: "10 Pack" },
  { value: 20, label: "20 Pack" },
];

export default function PackSizeSelector({
  disabled,
  value = 1,
  onChange,
  currentRun = 1,
  freeCardTokensRemaining = 0,
  usePaidCheckout = false,
  onUsePaidCheckout,
}) {
  const [mode, setMode] = useState("preset");
  const [customInput, setCustomInput] = useState("");
  const maxQty = maxCopyTarget(currentRun);
  const hasFreeTokens = freeCardTokensRemaining > 0 && !usePaidCheckout;
  const freeTokenCap = hasFreeTokens ? freeCardTokensRemaining : maxQty;
  const effectiveMaxQty = hasFreeTokens ? Math.min(maxQty, freeTokenCap) : maxQty;

  const effectiveQty =
    mode === "custom" && isValidCopyQuantity(customInput, currentRun)
      ? clampCopyQuantity(customInput, currentRun)
      : mode === "custom"
        ? null
        : clampCopyQuantity(value, currentRun);

  useEffect(() => {
    if (!hasFreeTokens) return;
    if (value > freeTokenCap) {
      onChange?.(clampCopyQuantity(Math.max(1, freeTokenCap), currentRun));
    }
  }, [hasFreeTokens, freeTokenCap, value, currentRun, onChange]);

  useEffect(() => {
    if (mode !== "preset") return;
    if (!PRESET_OPTIONS.some((opt) => opt.value === value)) {
      setMode("custom");
      setCustomInput(String(value));
    }
  }, [mode, value]);

  function selectPreset(q) {
    if (hasFreeTokens && q > freeTokenCap) return;
    setMode("preset");
    setCustomInput("");
    onChange?.(clampCopyQuantity(q, currentRun));
  }

  function selectCustomMode() {
    setMode("custom");
    if (isValidCopyQuantity(customInput, currentRun)) {
      onChange?.(clampCopyQuantity(customInput, currentRun));
    }
  }

  function handleCustomInputChange(raw) {
    const digits = raw.replace(/\D/g, "");
    if (digits === "") {
      setCustomInput("");
      return;
    }
    const n = Number(digits);
    const cap = effectiveMaxQty;
    if (n > cap) {
      onChange?.(clampCopyQuantity(cap, currentRun));
      setCustomInput(String(cap));
      return;
    }
    setCustomInput(digits);
    if (isValidCopyQuantity(digits, currentRun)) {
      onChange?.(clampCopyQuantity(digits, currentRun));
    }
  }

  const customError = useMemo(() => {
    if (mode !== "custom" || customInput === "") return null;
    const baseError = copyQuantityError(customInput, currentRun);
    if (baseError) return baseError;
    if (hasFreeTokens && Number(customInput) > freeTokenCap) {
      return `You only have ${freeTokenCap} free card${freeTokenCap === 1 ? "" : "s"} remaining.`;
    }
    return null;
  }, [mode, customInput, currentRun, hasFreeTokens, freeTokenCap]);

  const confirmationQty = effectiveQty ?? value;

  const tokenHelperLine = useMemo(() => {
    if (!hasFreeTokens || !confirmationQty) return null;
    if (confirmationQty >= freeCardTokensRemaining) {
      return "This will use all of your remaining free cards";
    }
    return `This will use ${confirmationQty} of your ${freeCardTokensRemaining} remaining free cards`;
  }, [hasFreeTokens, confirmationQty, freeCardTokensRemaining]);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111111]/90 p-4 sm:p-5">
      <h3 className="text-base font-semibold text-white">How many copies?</h3>
      <p className="mt-1 text-sm text-slate-400">
        Your tier price includes the card design plus all copies.
      </p>

      {hasFreeTokens ? (
        <p className="mt-3 text-sm font-medium text-brand-gold">
          You have {freeCardTokensRemaining} free card{freeCardTokensRemaining === 1 ? "" : "s"} remaining
        </p>
      ) : null}

      {usePaidCheckout && freeCardTokensRemaining > 0 ? (
        <p className="mt-3 text-sm text-slate-300">
          Paying standard price — your free cards will not be used on this order.
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {PRESET_OPTIONS.filter((opt) => opt.value <= maxQty).map((opt) => {
          const isSel = mode === "preset" && value === opt.value;
          const blockedByTokens = hasFreeTokens && opt.value > freeTokenCap;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled || blockedByTokens}
              onClick={() => selectPreset(opt.value)}
              className={`min-h-[44px] rounded-full border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                isSel
                  ? "border-2 border-[#ffd700] bg-[#ffd70011] text-[#ffd700]"
                  : "border border-[#2a2a2a] bg-[#1a1a1a] text-white hover:border-white/25"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
        <button
          type="button"
          disabled={disabled}
          onClick={selectCustomMode}
          className={`min-h-[44px] rounded-full border px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
            mode === "custom"
              ? "border-2 border-[#ffd700] bg-[#ffd70011] text-[#ffd700]"
              : "border border-[#2a2a2a] bg-[#1a1a1a] text-white hover:border-white/25"
          }`}
        >
          Custom
        </button>
      </div>

      {mode === "custom" ? (
        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-400" htmlFor="pack-custom-qty">
            Custom quantity
          </label>
          <input
            id="pack-custom-qty"
            type="number"
            min={COPY_QUANTITY_MIN}
            max={effectiveMaxQty}
            inputMode="numeric"
            placeholder="Enter quantity"
            value={customInput}
            disabled={disabled}
            onChange={(e) => handleCustomInputChange(e.target.value)}
            className={`mt-1.5 min-h-[44px] w-full rounded-xl border bg-cardBg2 px-3 py-2 text-sm text-white placeholder:text-slate-500 ${
              customError ? "border-rose-500/50" : "border-white/15"
            }`}
          />
          {customError ? <p className="mt-1.5 text-xs text-rose-300">{customError}</p> : null}
        </div>
      ) : null}

      {confirmationQty ? (
        <p className="mt-4 text-sm text-slate-300">
          You&apos;ll receive{" "}
          <span className="font-semibold text-brand-gold">{confirmationQty}</span>{" "}
          {confirmationQty === 1 ? "copy" : "copies"} of this card
        </p>
      ) : null}

      {tokenHelperLine ? (
        <p className="mt-2 text-sm text-brand-gold/90">{tokenHelperLine}</p>
      ) : null}

      {hasFreeTokens && typeof onUsePaidCheckout === "function" ? (
        <p className="mt-4 text-xs text-slate-400">
          You have {freeCardTokensRemaining} free cards remaining. Choose a pack size of{" "}
          {freeCardTokensRemaining} or less to use your free cards, or{" "}
          <button
            type="button"
            className="font-medium text-brand-gold underline underline-offset-2 hover:text-brand-gold-bright"
            onClick={() => onUsePaidCheckout(true)}
          >
            pay for the full pack
          </button>
          .
        </p>
      ) : null}

      {usePaidCheckout && typeof onUsePaidCheckout === "function" ? (
        <button
          type="button"
          className="mt-3 text-xs font-medium text-brand-gold underline underline-offset-2 hover:text-brand-gold-bright"
          onClick={() => onUsePaidCheckout(false)}
        >
          Use free cards instead
        </button>
      ) : null}
    </div>
  );
}
