import React from "react";
import { ACTION_CATEGORIES } from "../constants/actionCategories";
import { normalizeExperienceTier } from "../utils/cardCreationExperience";
import ActionCategoryIcon from "./ActionCategoryIcon";

export default function ActionCategoryStep({ value, onSelect, error = "", tier = "rookie" }) {
  const tierConfig = normalizeExperienceTier(tier);

  return (
    <div className="grid gap-5">
      <div>
        <h3 className="text-lg font-semibold text-white">What are you doing in this photo?</h3>
        <p className="mt-1 text-sm text-slate-400">
          Choose the action that best matches your uploaded photo.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ACTION_CATEGORIES.map((cat) => {
          const selected = value === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelect(cat.id)}
              className="action-category-btn relative flex min-h-[128px] flex-col items-center justify-center rounded-2xl border p-4 text-center transition will-change-transform hover:scale-[1.02]"
              style={{
                borderColor: selected ? tierConfig.color : "rgba(255, 255, 255, 0.12)",
                backgroundColor: selected ? `${tierConfig.color}18` : "rgba(15, 15, 20, 0.85)",
                boxShadow: selected ? `0 0 24px ${tierConfig.color}33` : "none",
                fontFamily: tierConfig.font,
              }}
            >
              {selected ? (
                <span
                  className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-slate-950"
                  style={{ backgroundColor: tierConfig.color }}
                >
                  ✓
                </span>
              ) : null}
              <ActionCategoryIcon
                categoryId={cat.id}
                className="mb-2 transition-transform"
                style={{ color: tierConfig.color }}
              />
              <p
                className="text-[13px] font-bold leading-tight"
                style={{ color: selected ? "#f8fafc" : "#e2e8f0" }}
              >
                {cat.label}
              </p>
              {cat.description ? (
                <p className="mt-1 text-[11px] leading-snug text-slate-400">{cat.description}</p>
              ) : null}
            </button>
          );
        })}
      </div>

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
