import React from "react";
import { ACTION_CATEGORIES, getActionCategory } from "../constants/actionCategories";
import { normalizeExperienceTier } from "../utils/cardCreationExperience";

export default function ActionCategoryStep({
  value,
  onSelect,
  onContinue,
  error = "",
  tier = "rookie",
  continueBusy = false,
}) {
  const tierConfig = normalizeExperienceTier(tier);
  const selectedCategory = getActionCategory(value);

  return (
    <div className="grid gap-5">
      <div>
        <h3 className="text-lg font-semibold text-white">What are you doing in this photo?</h3>
        <p className="mt-1 text-sm text-slate-400">
          Choose the action that best matches your uploaded photo.
        </p>
      </div>

      <div className="action-category-grid">
        {ACTION_CATEGORIES.map((cat) => {
          const selected = value === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelect(cat.id)}
              className="action-category-card"
              style={{
                borderColor: selected ? tierConfig.color : "rgba(255, 255, 255, 0.12)",
                backgroundColor: selected ? `${tierConfig.color}18` : "rgba(15, 15, 20, 0.85)",
                boxShadow: selected ? `0 0 24px ${tierConfig.color}33` : "none",
                fontFamily: tierConfig.font,
              }}
            >
              <p
                className="action-category-card__name"
                style={{ color: selected ? "#f8fafc" : "#e2e8f0" }}
              >
                {cat.label}
              </p>
              {cat.description ? (
                <p className="action-category-card__desc">{cat.description}</p>
              ) : null}
            </button>
          );
        })}
      </div>

      {value ? (
        <button
          type="button"
          disabled={continueBusy}
          onClick={onContinue}
          className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-neonBlue px-6 text-base font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-50"
        >
          {selectedCategory ? `Continue with ${selectedCategory.label} →` : "Next →"}
        </button>
      ) : null}

      <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100/95">
        <p>
          <span className="font-medium text-cyan-50">Tip:</span> For best results, choose the action that
          best matches your photo. The animation will look most realistic when it matches what you&apos;re
          doing.
        </p>
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
