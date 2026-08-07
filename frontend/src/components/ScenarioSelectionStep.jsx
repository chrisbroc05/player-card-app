import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../config/api";
import { normalizeExperienceTier } from "../utils/cardCreationExperience";

export const SCENARIO_NONE_ID = "none";

const NONE_OPTION = {
  id: SCENARIO_NONE_ID,
  title: "None of these match exactly",
  description: "Use a generic version of this motion — the AI will infer from your photo.",
};

export default function ScenarioSelectionStep({
  motionId,
  value,
  onSelect,
  onContinue,
  error = "",
  tier = "rookie",
  continueBusy = false,
}) {
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const tierConfig = normalizeExperienceTier(tier);

  useEffect(() => {
    if (!motionId) {
      setScenarios([]);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/cards/animation-scenarios?motion_id=${encodeURIComponent(motionId)}`
        );
        const data = await res.json().catch(() => []);
        if (!cancelled) setScenarios(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setScenarios([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [motionId]);

  const allOptions = [...scenarios, NONE_OPTION];

  return (
    <div className="scenario-selection grid gap-5">
      <div>
        <h3 className="text-lg font-semibold text-white">What does your photo look like?</h3>
        <p className="mt-1 text-sm text-slate-400">
          Pick the scenario that best matches your photo. This helps the AI understand exactly what
          position you&apos;re in and what motion to generate.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading scenarios…</p>
      ) : (
        <div className="scenario-selection-list" role="listbox" aria-label="Photo scenarios">
          {allOptions.map((scenario) => {
            const selected = value === scenario.id;
            return (
              <button
                key={scenario.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => onSelect(scenario.id)}
                className={`scenario-card${selected ? " scenario-card--selected" : ""}`}
                style={
                  selected
                    ? {
                        borderColor: tierConfig.color,
                        backgroundColor: `${tierConfig.color}18`,
                        boxShadow: `0 0 0 1px ${tierConfig.color}44`,
                      }
                    : undefined
                }
              >
                <p className="scenario-card__title">{scenario.title}</p>
                <p className="scenario-card__description">{scenario.description}</p>
              </button>
            );
          })}
        </div>
      )}

      {value ? (
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
