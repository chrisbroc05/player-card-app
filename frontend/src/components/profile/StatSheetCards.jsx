import React from "react";
import { STAT_CARDS } from "../../constants/statSheet";
import { formatMoney } from "../../utils/marketplace";

function formatStatCardValue(value, format) {
  if (format === "money") return formatMoney(value ?? 0);
  return value ?? 0;
}

export default function StatSheetCards({ stats, loading = false }) {
  return (
    <div className="profile-stat-sheet__grid" aria-busy={loading}>
      {STAT_CARDS.map((card) => (
        <div key={card.key} className="profile-stat-card">
          <p
            className="profile-stat-card__value"
            style={card.color ? { color: card.color } : undefined}
          >
            {loading ? "—" : formatStatCardValue(stats?.[card.key], card.format)}
          </p>
          <p className="profile-stat-card__label">{card.label}</p>
        </div>
      ))}
    </div>
  );
}
