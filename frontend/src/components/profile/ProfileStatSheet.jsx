import React, { useCallback, useEffect, useState } from "react";
import { API_BASE_URL, authHeaders } from "../../config/api";
import { formatApiError } from "../../utils/authFetch";
import { formatMoney } from "../../utils/marketplace";

const PERIOD_OPTIONS = [
  { id: "this_month", label: "This Month" },
  { id: "last_month", label: "Last Month" },
  { id: "this_year", label: "This Year" },
  { id: "all_time", label: "All Time" },
];

const STAT_CARDS = [
  { key: "cards_created", label: "Cards Created", icon: "🃏" },
  { key: "cards_sold", label: "Cards Sold", icon: null },
  { key: "total_earned", label: "Total Earned", format: "money", color: "#4CAF50" },
  { key: "total_spent", label: "Total Spent", format: "money", color: "#EF5350" },
  { key: "best_sale", label: "Best Sale", format: "money", color: "#C9A84C" },
  { key: "collection_count", label: "In Collection", icon: null },
];

function formatStatValue(key, value, format) {
  if (format === "money") return formatMoney(value ?? 0);
  return value ?? 0;
}

export default function ProfileStatSheet({ token }) {
  const [period, setPeriod] = useState("this_month");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStats = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/stats/summary?period=${encodeURIComponent(period)}`, {
        headers: { ...authHeaders(token) },
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Could not load stats."));
      setStats(data);
    } catch (e) {
      setError(e.message || "Could not load stats.");
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [token, period]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <section id="stat-sheet" className="profile-stat-sheet">
      <h2 className="profile-section-title">My Stat Sheet</h2>
      <div className="collection-filter-row profile-stat-sheet__filters" role="tablist" aria-label="Stat period">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={period === opt.id}
            className={`collection-filter-pill${period === opt.id ? " collection-filter-pill--active" : ""}`}
            onClick={() => setPeriod(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {error ? <p className="profile-stat-sheet__error">{error}</p> : null}
      <div className="profile-stat-sheet__grid" aria-busy={loading}>
        {STAT_CARDS.map((card) => (
          <div key={card.key} className="profile-stat-card">
            {card.icon ? (
              <span className="profile-stat-card__icon" aria-hidden>
                {card.icon}
              </span>
            ) : null}
            <p
              className="profile-stat-card__value"
              style={card.color ? { color: card.color } : undefined}
            >
              {loading ? "—" : formatStatValue(card.key, stats?.[card.key], card.format)}
            </p>
            <p className="profile-stat-card__label">{card.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
