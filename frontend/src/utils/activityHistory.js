/** Shared activity history display helpers */

import { formatMoney } from "./marketplace";
import { vaultTierBadge } from "./tierStyles";

export const ACTIVITY_FILTERS = [
  { id: "all", label: "All", type: null },
  { id: "trades", label: "Trades", type: "trades" },
  { id: "bought", label: "Bought", type: "marketplace_bought" },
  { id: "sold", label: "Sold", type: "marketplace_sold" },
  { id: "animated", label: "Animated", type: "animated_upgrade" },
  { id: "highlight", label: "Highlight", type: "highlight_upgrade" },
];

export const ACTIVITY_META = {
  trade_sent: {
    emoji: "🔄",
    label: "Trade Sent",
    shortLabel: "Sent",
    badgeClass: "border-sky-400/40 bg-sky-500/15 text-sky-100",
    iconWrapClass: "border-sky-400/35 bg-sky-500/15 text-sky-100",
  },
  trade_received: {
    emoji: "📥",
    label: "Trade Received",
    shortLabel: "Received",
    badgeClass: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
    iconWrapClass: "border-emerald-400/35 bg-emerald-500/15 text-emerald-100",
  },
  marketplace_sold: {
    emoji: "💰",
    label: "Sold",
    shortLabel: "Sold",
    badgeClass: "border-amber-400/40 bg-amber-500/15 text-amber-100",
    iconWrapClass: "border-amber-400/35 bg-amber-500/15 text-amber-100",
  },
  marketplace_bought: {
    emoji: "🛒",
    label: "Bought",
    shortLabel: "Bought",
    badgeClass: "border-violet-400/40 bg-violet-500/15 text-violet-100",
    iconWrapClass: "border-violet-400/35 bg-violet-500/15 text-violet-100",
  },
  animated_upgrade: {
    emoji: "✨",
    label: "Animated",
    shortLabel: "Animated",
    badgeClass: "border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-100",
    iconWrapClass: "border-fuchsia-400/35 bg-fuchsia-500/15 text-fuchsia-100",
  },
  highlight_upgrade: {
    emoji: "🎬",
    label: "Highlight",
    shortLabel: "Highlight",
    badgeClass: "border-[#D85A30]/40 bg-[#D85A30]/15 text-orange-100",
    iconWrapClass: "border-[#D85A30]/35 bg-[#D85A30]/15 text-orange-100",
  },
};

export function activityMeta(item, tier) {
  const base = ACTIVITY_META[item?.activity_type] || ACTIVITY_META.trade_sent;
  if (item?.activity_type !== "animated_upgrade" && item?.activity_type !== "highlight_upgrade") return base;
  const badge = vaultTierBadge(tier);
  return {
    ...base,
    badgeClass: badge.pill,
    iconWrapClass: `border-white/15 bg-black/30 ${badge.glow}`,
  };
}

export function relativeTimeAgo(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 48) return `${h} hour${h === 1 ? "" : "s"} ago`;
    const days = Math.floor(h / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  } catch {
    return "";
  }
}

export function formatActivityTimestamp(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function counterpartyLine(item) {
  const name = item?.counterparty?.display_name;
  if (!name) return null;
  const type = item.activity_type;
  if (type === "trade_sent" || type === "trade_received") {
    return `Traded with ${name}`;
  }
  if (type === "marketplace_bought") {
    return `Bought from ${name}`;
  }
  if (type === "marketplace_sold") {
    return `Sold to ${name}`;
  }
  return name;
}

export function marketplaceSoldAmountDisplay(item) {
  const gross = Number(item?.amount);
  if (!Number.isFinite(gross)) return null;
  const royaltyRaw = Number(item?.royalty_amount);
  const fee = Number.isFinite(royaltyRaw)
    ? Math.max(0, Math.round(royaltyRaw * 100) / 100)
    : Math.max(0, Math.round(gross * 0.02 * 100) / 100);
  const net = Math.max(0, Math.round((gross - fee) * 100) / 100);
  return {
    text: `+${formatMoney(net)} received`,
    className: "text-emerald-300",
    subtext: `Sale price ${formatMoney(gross)} — 2% platform fee (${formatMoney(fee)})`,
    subtextClassName: "text-[11px] leading-tight text-slate-500",
  };
}

export function amountDisplay(item) {
  if (item?.activity_type === "marketplace_sold") {
    return marketplaceSoldAmountDisplay(item);
  }
  if (item?.amount == null || Number.isNaN(Number(item.amount))) return null;
  const n = Number(item.amount);
  const formatted = formatMoney(Math.abs(n));
  if (item.activity_type === "marketplace_bought") {
    return { text: `-${formatted}`, className: "text-rose-300" };
  }
  return { text: formatted, className: "text-slate-300" };
}

export function filterActivityItems(items, filterId) {
  const filter = ACTIVITY_FILTERS.find((f) => f.id === filterId) || ACTIVITY_FILTERS[0];
  if (!filter.type) return items;
  if (filter.type === "trades") {
    return items.filter((i) => i.activity_type === "trade_sent" || i.activity_type === "trade_received");
  }
  return items.filter((i) => i.activity_type === filter.type);
}
