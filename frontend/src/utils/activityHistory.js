/** Shared activity history display helpers */

import { formatMoney, PLATFORM_ROYALTY_RATE, platformRoyaltyPercentLabel } from "./marketplace";
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
  card_created: {
    emoji: "🃏",
    label: "Card Created",
    shortLabel: "Created",
    badgeClass: "border-teal-400/40 bg-teal-500/15 text-teal-100",
    iconWrapClass: "border-teal-400/35 bg-teal-500/15 text-teal-100",
  },
};

export function activityMeta(item, tier) {
  const base = ACTIVITY_META[item?.activity_type] || ACTIVITY_META.trade_sent;
  if (
    item?.activity_type !== "animated_upgrade"
    && item?.activity_type !== "highlight_upgrade"
    && item?.activity_type !== "card_created"
  ) {
    return base;
  }
  const badge = vaultTierBadge(tier);
  return {
    ...base,
    badgeClass: badge.pill,
    iconWrapClass: `border-white/15 bg-black/30 ${badge.glow}`,
  };
}

/**
 * Row presentation for the full Activity History layout — circular badge colors,
 * glyph, and uppercase eyebrow label.
 */
const ACTIVITY_ROW_STYLES = {
  trade_sent: {
    label: "TRADE SENT",
    glyph: "→",
    badgeStyle: { backgroundColor: "#2563eb", color: "#ffffff" },
    labelColor: "#93c5fd",
  },
  trade_received: {
    label: "TRADE RECEIVED",
    glyph: "←",
    badgeStyle: { backgroundColor: "#16a34a", color: "#ffffff" },
    labelColor: "#86efac",
  },
  marketplace_sold: {
    label: "CARD SOLD",
    glyph: "$",
    badgeStyle: { backgroundColor: "#f0c030", color: "#1f1400" },
    labelColor: "#fcd34d",
  },
  marketplace_bought: {
    label: "MARKETPLACE PURCHASE",
    glyph: "🛍",
    badgeStyle: { backgroundColor: "#7c3aed", color: "#ffffff" },
    labelColor: "#c4b5fd",
  },
  animated_upgrade: {
    label: "ANIMATED UPGRADE",
    glyph: "✦",
    badgeStyle: { backgroundColor: "#a855f7", color: "#ffffff" },
    labelColor: "#d8b4fe",
  },
  highlight_upgrade: {
    label: "HIGHLIGHT CREATED",
    glyph: "▶",
    badgeStyle: { backgroundColor: "#D85A30", color: "#ffffff" },
    labelColor: "#fdba74",
  },
  card_created: {
    label: "CARD CREATED",
    glyph: "★",
    badgeStyle: { backgroundColor: "#0d9488", color: "#ffffff" },
    labelColor: "#5eead4",
  },
};

export function activityRowStyle(item) {
  const base = ACTIVITY_ROW_STYLES[item?.activity_type] || ACTIVITY_ROW_STYLES.trade_sent;
  if (item?.activity_type !== "animated_upgrade" && item?.activity_type !== "card_created") return base;
  const accent = vaultTierBadge(item?.card?.tier).accent;
  return { ...base, badgeStyle: { backgroundColor: accent, color: "#ffffff" } };
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
  const type = item?.activity_type;
  if (type === "animated_upgrade" || type === "highlight_upgrade") {
    return "Upgraded by you";
  }
  if (type === "card_created") {
    return "Created by you";
  }
  const name = item?.counterparty?.display_name;
  if (!name) return null;
  if (type === "trade_sent") return `Traded to @${name}`;
  if (type === "trade_received") return `Received from @${name}`;
  if (type === "marketplace_bought") return `Purchased from @${name}`;
  if (type === "marketplace_sold") return `Sold to @${name}`;
  return name;
}

/** Full timestamp for the activity row, e.g. "July 31, 2026 at 2:41 PM". */
export function formatActivityFullTimestamp(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return `${date} at ${time}`;
  } catch {
    return iso;
  }
}

/**
 * Amount column content for the full Activity History row.
 * Returns { text, tone, subtext } where tone is success | danger | muted.
 */
export function activityAmountDisplay(item) {
  const type = item?.activity_type;

  if (type === "trade_sent" || type === "trade_received") {
    return { text: "Free", tone: "muted", italic: true };
  }

  const raw = Number(item?.amount);
  if (!Number.isFinite(raw)) return { text: "—", tone: "muted" };

  if (type === "marketplace_sold") {
    const royalty = Number(item?.royalty_amount);
    const fee = Number.isFinite(royalty)
      ? Math.max(0, Math.round(royalty * 100) / 100)
      : Math.max(0, Math.round(raw * PLATFORM_ROYALTY_RATE * 100) / 100);
    const net = Math.max(0, Math.round((raw - fee) * 100) / 100);
    return {
      text: `+${formatMoney(net)}`,
      tone: "success",
      subtext: `−${formatMoney(fee)} fee`,
    };
  }

  if (type === "marketplace_bought") {
    return { text: `−${formatMoney(Math.abs(raw))}`, tone: "danger" };
  }

  if (type === "animated_upgrade") {
    return { text: `−${formatMoney(Math.abs(raw))}`, tone: "danger", subtext: "Animation", small: true };
  }

  if (type === "highlight_upgrade") {
    return { text: `−${formatMoney(Math.abs(raw))}`, tone: "danger", subtext: "Highlight", small: true };
  }

  if (type === "card_created") {
    return { text: `−${formatMoney(Math.abs(raw))}`, tone: "danger", subtext: "Card creation", small: true };
  }

  return { text: formatMoney(Math.abs(raw)), tone: "muted" };
}

export function marketplaceSoldAmountDisplay(item) {
  const gross = Number(item?.amount);
  if (!Number.isFinite(gross)) return null;
  const royaltyRaw = Number(item?.royalty_amount);
  const fee = Number.isFinite(royaltyRaw)
    ? Math.max(0, Math.round(royaltyRaw * 100) / 100)
    : Math.max(0, Math.round(gross * PLATFORM_ROYALTY_RATE * 100) / 100);
  const net = Math.max(0, Math.round((gross - fee) * 100) / 100);
  return {
    text: `+${formatMoney(net)} received`,
    className: "text-emerald-300",
    subtext: `Sale price ${formatMoney(gross)} — ${platformRoyaltyPercentLabel()} platform fee (${formatMoney(fee)})`,
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
