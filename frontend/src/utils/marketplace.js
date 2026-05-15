/** Free Agency marketplace helpers */

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
  return Math.round(n * 0.02 * 100) / 100;
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
  if (s === "cancelled") return "border-slate-500/50 bg-slate-500/15 text-slate-400";
  return "border-amber-500/50 bg-amber-500/15 text-amber-200";
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

export function compareOfferToAsking(offerAmount, askingPrice) {
  const o = Number(offerAmount);
  const a = Number(askingPrice);
  if (!Number.isFinite(o) || !Number.isFinite(a)) return "";
  if (o > a) return "above asking";
  if (o < a) return "below asking";
  return "at asking";
}
