import React from "react";
import { formatMoney } from "../utils/marketplace";
import AnimationActionPicker from "./AnimationActionPicker";

export default function AnimatedUpgradeOption({
  enabled,
  onEnabledChange,
  animatedUpgradePrice = 10,
  actionCategory,
  onActionCategoryChange,
  selectedScenarioId,
  onScenarioSelect,
  actionError,
  scenarioError,
  disabled,
  error,
  tier = "rookie",
}) {
  const price = Number(animatedUpgradePrice) || 10;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111111]/90 p-4 sm:p-5">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={enabled}
          disabled={disabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-white/20 bg-cardBg2 accent-[#ffd700]"
        />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-white">
            Animate this card{" "}
            <span className="text-brand-gold">+{formatMoney(price)}</span>
          </span>
          <span className="mt-1 block text-xs text-slate-400">
            Your static card brought to life with AI animation. You can also animate later from your
            collection for {formatMoney(price)}.
          </span>
        </span>
      </label>

      {enabled ? (
        <div className="mt-5 border-t border-white/10 pt-5">
          <AnimationActionPicker
            actionCategory={actionCategory}
            onActionCategoryChange={onActionCategoryChange}
            selectedScenarioId={selectedScenarioId}
            onScenarioSelect={onScenarioSelect}
            actionError={actionError || error}
            scenarioError={scenarioError}
            tier={tier}
          />
        </div>
      ) : null}
    </div>
  );
}
