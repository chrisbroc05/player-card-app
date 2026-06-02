import React from "react";
import { ACTION_CATEGORIES } from "../constants/actionCategories";

export default function ActionCategoryStep({ value, onSelect, error = "" }) {
  return (
    <div className="grid gap-5">
      <div>
        <h3 className="text-lg font-semibold text-white">What are you doing in this photo?</h3>
        <p className="mt-1 text-sm text-slate-400">
          Choose the action that best matches your uploaded photo.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ACTION_CATEGORIES.map((cat) => {
          const selected = value === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelect(cat.id)}
              className={`relative flex min-h-[120px] flex-col items-center justify-center rounded-2xl border p-5 text-center transition ${
                selected
                  ? "border-neonTeal/70 bg-neonTeal/10 shadow-[0_0_28px_rgba(45,212,191,0.2)]"
                  : "border-white/10 bg-cardBg2 hover:border-white/25 hover:bg-cardBg"
              }`}
            >
              {selected ? (
                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-neonTeal text-[10px] font-bold text-slate-950">
                  ✓
                </span>
              ) : null}
              <span className="text-3xl" aria-hidden>
                {cat.icon}
              </span>
              <p className={`mt-3 text-base font-semibold ${selected ? "text-teal-50" : "text-white"}`}>
                {cat.label}
              </p>
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
