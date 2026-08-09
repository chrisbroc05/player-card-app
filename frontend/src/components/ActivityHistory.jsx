import React from "react";
import { Link, useLocation } from "react-router-dom";
import CardImage from "./CardImage";
import { API_BASE_URL, authHeaders } from "../config/api";
import {
  ACTIVITY_FILTERS,
  activityAmountDisplay,
  activityMeta,
  activityRowStyle,
  amountDisplay,
  counterpartyLine,
  filterActivityItems,
  formatActivityFullTimestamp,
  relativeTimeAgo,
} from "../utils/activityHistory";
import { getCardBannerStyles, themeDisplayLabel } from "../utils/cardBannerStyles";
import { normalizeTierKey } from "../utils/cardTemplate";
import { formatEditionShort, vaultTierBadge } from "../utils/tierStyles";

const ACTIVITY_PAGE_SIZE = 20;

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

function ActivityAmount({ amount, variant = "compact" }) {
  if (!amount) return null;
  const primaryClass =
    variant === "full" ? "text-lg font-semibold tabular-nums" : "text-xs font-semibold tabular-nums";
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`${primaryClass} ${amount.className}`}>{amount.text}</span>
      {amount.subtext ? (
        <span
          className={
            amount.subtextClassName ||
            "max-w-[220px] text-[11px] leading-tight text-slate-500 sm:max-w-none sm:text-right"
          }
        >
          {amount.subtext}
        </span>
      ) : null}
    </div>
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
                <ActivityAmount amount={amt} />
                <span className="text-slate-500">{relativeTimeAgo(item.completed_at || item.created_at)}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ActivityRow({ item }) {
  const card = item?.card || null;
  const style = activityRowStyle(item);
  const tier = card?.tier || "rookie";
  const tierKey = normalizeTierKey(tier);
  const theme = card?.theme ?? card?.special_theme ?? "";
  const badge = vaultTierBadge(tier);
  const bannerStyles = getCardBannerStyles(tier, theme);
  const themeLabel = themeDisplayLabel(theme);
  const edition = formatEditionShort(card?.edition_number, card?.print_run);
  const counterparty = counterpartyLine(item);
  const amount = activityAmountDisplay(item);
  const timestamp = formatActivityFullTimestamp(item?.completed_at || item?.created_at);

  return (
    <li className="activity-row">
      <div className="activity-row__badge" style={style.badgeStyle} aria-hidden>
        {style.glyph}
      </div>

      <div className="activity-row__thumb">
        {card ? (
          <CardImage
            card={card}
            alt={card.player_name || "Card"}
            frameClassName="activity-row__frame"
            infoBannerVariant="thumb"
            showInfoBanner
            playOnHover
          />
        ) : null}
      </div>

      <div className="activity-row__details">
        <p className="activity-row__label" style={{ color: style.labelColor }}>
          {style.label}
        </p>
        <h3 className={`activity-row__name activity-row__name--${tierKey}`}>
          {card?.player_name || "Card"}
        </h3>

        <div className="activity-row__meta">
          <span className={`activity-row__tier-pill ${bannerStyles.tierPillClass}`}>
            {bannerStyles.tierPillLabel}
          </span>
          {themeLabel ? <span className="activity-row__theme">{themeLabel}</span> : null}
          <span className="activity-row__edition" style={{ color: badge.accent }}>
            {edition}
          </span>
        </div>
      </div>

      <div className="activity-row__foot">
        {counterparty ? <p className="activity-row__counterparty">{counterparty}</p> : null}
        {timestamp ? <p className="activity-row__time">{timestamp}</p> : null}
      </div>

      <div className="activity-row__amount">
        <span
          className={`activity-row__amount-value activity-row__amount-value--${amount.tone}${
            amount.small ? " activity-row__amount-value--sm" : ""
          }${amount.italic ? " activity-row__amount-value--italic" : ""}`}
        >
          {amount.text}
        </span>
        {amount.subtext ? <span className="activity-row__amount-sub">{amount.subtext}</span> : null}
      </div>
    </li>
  );
}

export function ActivityHistorySection({
  items,
  loading,
  error,
  filter,
  onFilterChange,
  showFilters = true,
  emptyMessage = "No activity yet — start by creating your first card!",
}) {
  const [page, setPage] = React.useState(0);

  const filtered = React.useMemo(
    () => (showFilters ? filterActivityItems(items || [], filter) : items || []),
    [items, filter, showFilters]
  );

  React.useEffect(() => {
    setPage(0);
  }, [filter, items]);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / ACTIVITY_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * ACTIVITY_PAGE_SIZE;
  const visible = filtered.slice(start, start + ACTIVITY_PAGE_SIZE);

  return (
    <section className="activity-history">
      <div className="activity-history__head">
        <h2 className="activity-history__title">Activity History</h2>
        <p className="activity-history__subtitle">
          Completed trades, marketplace sales, animated upgrades, and highlight cards.
        </p>
        {showFilters ? (
          <div className="activity-history__tabs">
            {ACTIVITY_FILTERS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onFilterChange?.(tab.id)}
                className={`activity-history__tab${
                  filter === tab.id ? " activity-history__tab--active" : ""
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {error ? <div className="activity-history__error">{error}</div> : null}

      {loading ? (
        <div className="activity-history__loading">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-neonBlue" />
        </div>
      ) : total === 0 ? (
        <p className="activity-history__empty">{emptyMessage}</p>
      ) : (
        <>
          <ul className="activity-history__list">
            {visible.map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </ul>

          {total > ACTIVITY_PAGE_SIZE ? (
            <div className="activity-history__pager">
              <span className="activity-history__pager-label">
                Showing {start + 1}-{Math.min(start + ACTIVITY_PAGE_SIZE, total)} of {total} activities
              </span>
              <div className="activity-history__pager-btns">
                <button
                  type="button"
                  disabled={safePage === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="activity-history__pager-btn"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  className="activity-history__pager-btn"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

export function ProfileActivityCompactList({ items, loading }) {
  if (loading) {
    return (
      <div className="profile-page__loading">
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
    <ul className="profile-activity-list">
      {items.map((item) => {
        const style = activityRowStyle(item);
        const amount = activityAmountDisplay(item);
        const meta = activityMeta(item, item?.card?.tier);
        return (
          <li key={item.id} className="profile-activity-row">
            <span className="profile-activity-row__badge" style={style.badgeStyle} aria-hidden>
              {style.glyph}
            </span>
            <div className="profile-activity-row__main">
              <p className="profile-activity-row__name">{item.card?.player_name || "Card"}</p>
              <p className="profile-activity-row__type">{meta.label}</p>
            </div>
            <span
              className={`profile-activity-row__amount profile-activity-row__amount--${amount.tone}`}
              style={
                amount.tone === "success"
                  ? { color: "var(--text-success)" }
                  : amount.tone === "danger"
                    ? { color: "var(--text-danger)" }
                    : undefined
              }
            >
              {amount.text}
            </span>
            <span className="profile-activity-row__time">
              {relativeTimeAgo(item.completed_at || item.created_at)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function RecentActivitySection({ token, limit = 5 }) {
  const location = useLocation();
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
  }, [token, limit, location.key]);

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
