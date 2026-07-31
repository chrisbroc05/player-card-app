import { formatMoney } from "./marketplace";

export const DEFAULT_COPY_PRICING_TIERS = [
  { min_copies: 1, max_copies: 4, price_per_copy: 0.5 },
  { min_copies: 5, max_copies: 9, price_per_copy: 0.4 },
  { min_copies: 10, max_copies: null, price_per_copy: 0.3 },
];

export function normalizeCopyTiers(tiers) {
  if (!Array.isArray(tiers) || !tiers.length) return DEFAULT_COPY_PRICING_TIERS;
  return tiers.map((t) => ({
    min_copies: Number(t.min_copies) || 1,
    max_copies: t.max_copies == null ? null : Number(t.max_copies),
    price_per_copy: Number(t.price_per_copy) || 0,
  }));
}

export function copyUnitPriceForQuantity(quantity, tiers = DEFAULT_COPY_PRICING_TIERS) {
  const q = Math.max(1, Number(quantity) || 1);
  const list = normalizeCopyTiers(tiers);
  for (const tier of list) {
    const lo = tier.min_copies;
    const hi = tier.max_copies ?? Infinity;
    if (q >= lo && q <= hi) return tier.price_per_copy;
  }
  return list[0]?.price_per_copy ?? 0.5;
}

export function copyChargeForQuantity(quantity, currentRun = 1, tiers = DEFAULT_COPY_PRICING_TIERS) {
  const target = Math.max(1, Number(quantity) || 1);
  const current = Math.max(1, Number(currentRun) || 1);
  const extra = Math.max(0, target - current);
  const unit = copyUnitPriceForQuantity(target, tiers);
  const total = Math.round(extra * unit * 100) / 100;
  return { target, current, extra, unit, total };
}

export function formatCopyTierSummary(tiers = DEFAULT_COPY_PRICING_TIERS) {
  return normalizeCopyTiers(tiers)
    .map((t) => {
      const range = t.max_copies ? `${t.min_copies}–${t.max_copies}` : `${t.min_copies}+`;
      return `${range} copies: ${formatMoney(t.price_per_copy)} each`;
    })
    .join(" | ");
}

export function bulkDiscountMessage(quantity) {
  const q = Math.max(1, Number(quantity) || 1);
  if (q >= 10) return "Bulk discount applied! (10+ copies)";
  if (q >= 5) return "Bulk discount applied!";
  return null;
}

export const COPY_QUANTITY_MIN = 1;
export const COPY_QUANTITY_MAX = 100;

export function isValidCopyQuantity(value) {
  if (value === "" || value === null || value === undefined) return false;
  const n = Number(value);
  return Number.isInteger(n) && n >= COPY_QUANTITY_MIN && n <= COPY_QUANTITY_MAX;
}

export function clampCopyQuantity(value) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return COPY_QUANTITY_MIN;
  return Math.min(COPY_QUANTITY_MAX, Math.max(COPY_QUANTITY_MIN, n));
}

export function copyQuantitySummaryLine(quantity) {
  const q = clampCopyQuantity(quantity);
  if (q === 1) return "You will receive 1 unique card (1 of 1) in your collection.";
  return `You will receive ${q} unique cards (#1 of ${q} through #${q} of ${q}) in your collection.`;
}
