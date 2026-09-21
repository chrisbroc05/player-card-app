import React from "react";
import { STAT_PERIOD_OPTIONS } from "../../constants/statSheet";

export default function StatPeriodFilters({ period, onChange, className = "" }) {
  return (
    <div
      className={`collection-filter-row profile-stat-sheet__filters${className ? ` ${className}` : ""}`}
      role="tablist"
      aria-label="Stat period"
    >
      {STAT_PERIOD_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={period === opt.id}
          className={`collection-filter-pill${period === opt.id ? " collection-filter-pill--active" : ""}`}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
