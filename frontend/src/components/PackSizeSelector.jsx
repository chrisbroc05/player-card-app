import React, { useEffect, useState } from "react";
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
}) {
  const [mode, setMode] = useState("preset");
  const [customInput, setCustomInput] = useState("");
  const maxQty = maxCopyTarget(currentRun);

  const effectiveQty =
    mode === "custom" && isValidCopyQuantity(customInput, currentRun)
      ? clampCopyQuantity(customInput, currentRun)
      : mode === "custom"
        ? null
        : clampCopyQuantity(value, currentRun);

  useEffect(() => {
    if (mode !== "preset") return;
    if (!PRESET_OPTIONS.some((opt) => opt.value === value)) {
      setMode("custom");
      setCustomInput(String(value));
    }
  }, [mode, value]);

  function selectPreset(q) {
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
    if (n > maxQty) {
      onChange?.(clampCopyQuantity(maxQty, currentRun));
      setCustomInput(String(maxQty));
      return;
    }
    setCustomInput(digits);
    if (isValidCopyQuantity(digits, currentRun)) {
      onChange?.(clampCopyQuantity(digits, currentRun));
    }
  }

  const customError =
    mode === "custom" && customInput !== "" ? copyQuantityError(customInput, currentRun) : null;

  const confirmationQty = effectiveQty ?? value;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111111]/90 p-4 sm:p-5">
      <h3 className="text-base font-semibold text-white">How many copies?</h3>
      <p className="mt-1 text-sm text-slate-400">
        Your tier price includes the card design plus all copies.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {PRESET_OPTIONS.filter((opt) => opt.value <= maxQty).map((opt) => {
          const isSel = mode === "preset" && value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => selectPreset(opt.value)}
              className={`min-h-[44px] rounded-full border px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
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
            max={maxQty}
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
    </div>
  );
}
