import React from "react";
import { STAT_CARDS } from "../../constants/statSheet";
import { formatMoney } from "../../utils/marketplace";
import StatSheetLoadingOverlay from "./StatSheetLoadingOverlay";

function formatStatCardValue(value, format) {
  if (format === "money") return formatMoney(value ?? 0);
  return value ?? 0;
}

export default function StatSheetCards({ stats, loading = false, withLoadingOverlay = false }) {
  const showPlaceholder = loading && stats == null;

  const grid = (
    <div className="profile-stat-sheet__grid">
      {STAT_CARDS.map((card) => (
        <div key={card.key} className="profile-stat-card">
          <p
            className="profile-stat-card__value"
            style={card.color ? { color: card.color } : undefined}
          >
            {showPlaceholder ? "—" : formatStatCardValue(stats?.[card.key], card.format)}
          </p>
          <p className="profile-stat-card__label">{card.label}</p>
        </div>
      ))}
    </div>
  );

  if (withLoadingOverlay) {
    return <StatSheetLoadingOverlay loading={loading}>{grid}</StatSheetLoadingOverlay>;
  }

  return grid;
}
