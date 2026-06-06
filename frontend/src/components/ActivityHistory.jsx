import React from "react";
import { Link } from "react-router-dom";
import CardImage from "./CardImage";
import { API_BASE_URL, authHeaders } from "../config/api";
import { CARD_IMAGE_FRAME_XS } from "../utils/cardImageStyles";
import {
  ACTIVITY_FILTERS,
  activityMeta,
  amountDisplay,
  counterpartyLine,
  formatActivityTimestamp,
  relativeTimeAgo,
} from "../utils/activityHistory";
import { vaultTierBadge } from "../utils/tierStyles";

function ActivityTypeBadge({ item }) {
  const meta = activityMeta(item, item?.card?.tier);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.badgeClass}`}
    >
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
    </span>
  );
}

function ActivityIcon({ item }) {
  const meta = activityMeta(item, item?.card?.tier);
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-lg ${meta.iconWrapClass}`}
      aria-hidden
    >
      {meta.emoji}
    </span>
  );
}

export function ActivityHistoryCompactList({ items, loading }) {
  if (loading) {
    return (
      <div className="flex min-h-[120px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-neonBlue" />
      </div>
    );
  }

  if (!items?.length) {
    return (
      <p className="rounded-xl border border-dashed border-white/15 bg-cardBg2/40 px-4 py-8 text-center text-sm text-slate-500">
        No activity yet. Start by creating your first card!
      </p>
    );
  }

  return (
    <ul className="divide-y divide-white/10 rounded-xl border border-white/10 bg-cardBg2/60">
      {items.map((item) => {
        const cp = counterpartyLine(item);
        const amt = amountDisplay(item);
        return (
          <li key={item.id} className="flex items-start gap-3 px-4 py-3.5">
            <ActivityIcon item={item} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-medium text-white">{item.card?.player_name || "Card"}</p>
                <ActivityTypeBadge item={item} />
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-500">{item.card?.card_id}</p>
              {cp ? <p className="mt-1 text-sm text-slate-400">{cp}</p> : null}
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
                {amt ? <span className={`font-semibold tabular-nums ${amt.className}`}>{amt.text}</span> : null}
                <span className="text-slate-500">{relativeTimeAgo(item.completed_at || item.created_at)}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ActivityHistorySection({
  items,
  loading,
  error,
  filter,
  onFilterChange,
  showFilters = true,
  emptyMessage = "No activity yet. Start by creating your first card!",
}) {
  const filtered = showFilters
    ? (() => {
        const f = ACTIVITY_FILTERS.find((x) => x.id === filter) || ACTIVITY_FILTERS[0];
        if (!f.type) return items;
        if (f.type === "trades") {
          return items.filter(
            (i) => i.activity_type === "trade_sent" || i.activity_type === "trade_received"
          );
        }
        return items.filter((i) => i.activity_type === f.type);
      })()
    : items;

  return (
    <section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Activity History</h2>
          <p className="mt-1 text-sm text-slate-400">Completed trades, marketplace sales, and animated upgrades.</p>
        </div>
        {showFilters ? (
          <div className="flex flex-wrap gap-1.5">
            {ACTIVITY_FILTERS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onFilterChange?.(tab.id)}
                className={`min-h-[36px] rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  filter === tab.id
                    ? "border-neonBlue/50 bg-neonBlue/15 text-white"
                    : "border-white/15 bg-cardBg2 text-slate-400 hover:border-white/25 hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-white/10 bg-cardBg/40">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-neonBlue" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/15 bg-cardBg/40 px-4 py-12 text-center text-sm text-slate-500">
          {emptyMessage}
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => {
            const cp = counterpartyLine(item);
            const amt = amountDisplay(item);
            const badge = vaultTierBadge(item.card?.tier);
            const meta = activityMeta(item, item.card?.tier);
            return (
              <li
                key={item.id}
                className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-cardBg p-4 shadow-lg sm:flex-row sm:items-center"
              >
                <div className="mx-auto w-24 shrink-0 sm:mx-0">
                  <CardImage
                    card={item.card}
                    alt={item.card?.player_name}
                    frameClassName={CARD_IMAGE_FRAME_XS}
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-white">{item.card?.player_name}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.pill}`}>
                      {badge.label}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.badgeClass}`}
                    >
                      <span aria-hidden>{meta.emoji}</span>
                      {meta.label}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-slate-500">{item.card?.card_id}</p>
                  {cp ? <p className="text-sm text-slate-300">{cp}</p> : null}
                  <p className="text-xs text-slate-500">
                    {formatActivityTimestamp(item.completed_at || item.created_at)}
                    <span className="mx-2 text-white/20">·</span>
                    {relativeTimeAgo(item.completed_at || item.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 sm:min-w-[88px]">
                  {amt ? (
                    <span className={`text-lg font-semibold tabular-nums ${amt.className}`}>{amt.text}</span>
                  ) : (
                    <span className="text-xs text-slate-500">Free</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function RecentActivitySection({ token, limit = 5 }) {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/activity/history?limit=${limit}`, {
          headers: { ...authHeaders(token) },
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok) {
          setItems(Array.isArray(data.items) ? data.items : []);
        } else if (!cancelled) {
          setItems([]);
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, limit]);

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-cardBg p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
        <Link
          to="/trades#activity-history"
          className="text-sm font-medium text-neonTeal transition hover:text-teal-200"
        >
          View Full History →
        </Link>
      </div>
      <ActivityHistoryCompactList items={items} loading={loading} />
      {!loading && items.length > 0 ? (
        <div className="mt-4 text-center sm:hidden">
          <Link
            to="/trades#activity-history"
            className="inline-flex text-sm font-medium text-neonTeal transition hover:text-teal-200"
          >
            View Full History →
          </Link>
        </div>
      ) : null}
    </section>
  );
}
