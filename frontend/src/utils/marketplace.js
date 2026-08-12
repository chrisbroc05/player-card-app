/** Free Agency Marketplace helpers */

export const PRIORITY_LISTING_FEE = 2;

/** Marketplace platform royalty on completed cash sales (must match backend PLATFORM_ROYALTY_RATE). */
export const PLATFORM_ROYALTY_RATE = 0.08;

export function platformRoyaltyPercentLabel() {
  return `${Math.round(PLATFORM_ROYALTY_RATE * 100)}%`;
}

export function isActivePriorityListing(listing) {
  if (!listing) return false;
  if (!listing.is_priority_listing) return false;
  const exp = listing.priority_expires_at;
  if (!exp) return true;
  const t = new Date(exp).getTime();
  return Number.isFinite(t) && t > Date.now();
}

/** Priority rows first, then standard rows with user sort. */
export function sortMarketplaceBrowseRows(rows, sortKey, sortOrder) {
  const priority = [];
  const standard = [];
  for (const row of rows) {
    if (isActivePriorityListing(row)) priority.push(row);
    else standard.push(row);
  }

  const desc = sortOrder !== "asc";
  const cmp = (a, b) => {
    let va;
    let vb;
    if (sortKey === "asking_price") {
      va = Number(a.asking_price) || 0;
      vb = Number(b.asking_price) || 0;
    } else if (sortKey === "player_name") {
      va = (a.player_name || "").toLowerCase();
      vb = (b.player_name || "").toLowerCase();
    } else {
      va = new Date(a.listed_at || 0).getTime();
      vb = new Date(b.listed_at || 0).getTime();
    }
    if (va < vb) return desc ? 1 : -1;
    if (va > vb) return desc ? -1 : 1;
    return 0;
  };

  priority.sort((a, b) => {
    const va = new Date(a.priority_listed_at || a.listed_at || 0).getTime();
    const vb = new Date(b.priority_listed_at || b.listed_at || 0).getTime();
    return vb - va;
  });
  standard.sort(cmp);
  return [...priority, ...standard];
}

export function formatMoney(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function computeRoyaltyPreview(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * PLATFORM_ROYALTY_RATE * 100) / 100;
}

export function normalizeTierKey(tier) {
  const t = (tier || "").toLowerCase().replace(/-/g, "_");
  if (t === "allstar") return "all_star";
  return t;
}

export function offerStatusStyle(status) {
  const s = (status || "").toLowerCase();
  if (s === "accepted") return "border-emerald-500/50 bg-emerald-500/15 text-emerald-200";
  if (s === "declined") return "border-rose-500/50 bg-rose-500/15 text-rose-200";
  if (s === "cancelled" || s === "expired") return "border-slate-500/50 bg-slate-500/15 text-slate-400";
  return "border-amber-500/50 bg-amber-500/15 text-amber-200";
}

/** Subtle listing countdown on browse grid (null days → omit). */
export function listingExpiresSubtextClass(daysRemaining) {
  if (daysRemaining == null || Number.isNaN(Number(daysRemaining))) return "text-slate-500";
  const d = Number(daysRemaining);
  if (d <= 0) return "text-rose-400 font-medium";
  if (d <= 3) return "text-amber-400 font-medium";
  return "text-slate-500";
}

export function listingExpiresLabel(daysRemaining) {
  if (daysRemaining == null || Number.isNaN(Number(daysRemaining))) return null;
  const d = Number(daysRemaining);
  if (d <= 0) return "Expires today";
  return `Expires in ${d} day${d === 1 ? "" : "s"}`;
}

/** Pending offer expiry line (buyer/seller views). */
export function offerExpiresLineClass(daysRemaining) {
  if (daysRemaining == null || Number.isNaN(Number(daysRemaining))) return "text-slate-500";
  const d = Number(daysRemaining);
  if (d <= 0) return "text-rose-400 font-semibold";
  if (d <= 3) return "text-amber-400 font-semibold";
  return "text-slate-500";
}

export function offerExpiresLabel(daysRemaining) {
  return listingExpiresLabel(daysRemaining);
}

export function listedAgeLabel(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days < 1) return "Listed today";
    if (days === 1) return "Listed 1 day ago";
    return `Listed ${days} days ago`;
  } catch {
    return "";
  }
}

export function sentAgeLabel(iso) {
  if (!iso) return "";
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Sent just now";
    if (mins < 60) return `Sent ${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Sent ${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Sent 1 day ago";
    return `Sent ${days} days ago`;
  } catch {
    return "";
  }
}

export function compareOfferToAsking(offerAmount, askingPrice) {
  const o = Number(offerAmount);
  const a = Number(askingPrice);
  if (!Number.isFinite(o) || !Number.isFinite(a)) return "";
  if (o > a) return "above asking";
  if (o < a) return "below asking";
  return "at asking";
}

export function parseOfferAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

/** Cash offer submit button label from amount input */
export function cashOfferButtonLabel(amount, askingPrice) {
  const n = parseOfferAmount(amount);
  if (n == null) return "Submit Offer";
  const formatted = formatMoney(n);
  const asking = Number(askingPrice);
  if (Number.isFinite(asking) && Math.abs(n - asking) < 0.005) {
    return `Buy at ${formatted}`;
  }
  return `Offer ${formatted}`;
}

/** Seller counter-offer button label */
export function counterOfferButtonLabel(amount) {
  const n = parseOfferAmount(amount);
  if (n == null) return "Send Counter";
  return `Counter ${formatMoney(n)}`;
}
