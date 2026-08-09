import React from "react";
import { normalizeExperienceTier } from "../utils/cardCreationExperience";

const THROWING_OPTIONS = [
  { id: "right", label: "Right Hand" },
  { id: "left", label: "Left Hand" },
];

const BATTING_OPTIONS = [
  { id: "right", label: "Bats Right" },
  { id: "left", label: "Bats Left" },
  { id: "switch", label: "Switch Hitter" },
];

function OptionGroup({ label, options, value, onSelect, tierConfig }) {
  return (
    <div className="handedness-group">
      <p className="handedness-group__label">{label}</p>
      <div className="handedness-group__options">
        {options.map((opt) => {
          const selected = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              className="handedness-option"
              style={
                selected
                  ? {
                      borderColor: tierConfig.color,
                      backgroundColor: `${tierConfig.color}22`,
                      boxShadow: `0 0 0 1px ${tierConfig.color}55`,
                    }
                  : undefined
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function HandednessStep({
  throwingHand,
  battingSide,
  onThrowingHandChange,
  onBattingSideChange,
  onContinue,
  error = "",
  tier = "rookie",
  continueBusy = false,
}) {
  const canContinue = Boolean(throwingHand && battingSide);

  return (
    <div className="handedness-step grid gap-6">
      <div>
        <h3 className="text-lg font-semibold text-white">Player handedness</h3>
        <p className="mt-1 text-sm text-slate-400">
          Tell us how your player throws and bats so the AI animates them accurately.
        </p>
      </div>

      <div className="handedness-step__groups">
        <OptionGroup
          label="Which hand does your player throw with?"
          options={THROWING_OPTIONS}
          value={throwingHand}
          onSelect={onThrowingHandChange}
          tierConfig={normalizeExperienceTier(tier)}
        />

        <div className="handedness-step__divider" aria-hidden />

        <OptionGroup
          label="Which side of the plate does your player bat from?"
          options={BATTING_OPTIONS}
          value={battingSide}
          onSelect={onBattingSideChange}
          tierConfig={normalizeExperienceTier(tier)}
        />
      </div>

      <p className="text-center text-sm text-slate-400">
        This helps the AI animate your player accurately and consistently
      </p>

      {canContinue ? (
        <button
          type="button"
          disabled={continueBusy}
          onClick={onContinue}
          className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-neonBlue px-6 text-base font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-50"
        >
          Continue →
        </button>
      ) : null}

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
