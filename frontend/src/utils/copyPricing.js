import { formatMoney } from "./marketplace";

export const MAX_COPIES_PER_ORDER = 100;
export const MAX_COPIES_PER_USER_PER_CARD = 200;
export const MAX_COPIES_LISTED_AT_ONCE = 50;

export const COPY_QUANTITY_MIN = 1;
/** @deprecated use MAX_COPIES_PER_ORDER — kept for existing imports */
export const COPY_QUANTITY_MAX = MAX_COPIES_PER_ORDER;

export const DEFAULT_COPY_PRICING_TIERS = [
  { min_copies: 2, max_copies: 4, price_per_copy: 0.5, label: "Small Bundle" },
  { min_copies: 5, max_copies: 9, price_per_copy: 0.4, label: "Bundle" },
  { min_copies: 10, max_copies: 49, price_per_copy: 0.3, label: "Large Bundle" },
  { min_copies: 50, max_copies: 100, price_per_copy: 0.25, label: "Collector Pack" },
];

export const PRICING_TIER_ROWS = [
  { range: "1", label: "Single", price: "Included", min: 1, max: 1 },
  { range: "2–4", label: "Small Bundle", price: "$0.50 each", min: 2, max: 4 },
  { range: "5–9", label: "Bundle", price: "$0.40 each", min: 5, max: 9 },
  { range: "10–49", label: "Large Bundle", price: "$0.30 each", min: 10, max: 49 },
  { range: "50–100", label: "Collector Pack", price: "$0.25 each", min: 50, max: 100 },
];

export function normalizeCopyTiers(tiers) {
  if (!Array.isArray(tiers) || !tiers.length) return DEFAULT_COPY_PRICING_TIERS;
  return tiers.map((t) => ({
    min_copies: Number(t.min_copies) || 1,
    max_copies: t.max_copies == null ? null : Number(t.max_copies),
    price_per_copy: Number(t.price_per_copy) || 0,
    label: t.label || "",
  }));
}

export function getCopyTierLabel(quantity) {
  const q = Math.max(1, Number(quantity) || 1);
  if (q <= 1) return "Single";
  if (q <= 4) return "Small Bundle";
  if (q <= 9) return "Bundle";
  if (q <= 49) return "Large Bundle";
  return "Collector Pack";
}

export function isCurrentPricingTier(quantity, tierRow) {
  const q = Math.max(1, Number(quantity) || 1);
  return q >= tierRow.min && q <= tierRow.max;
}

export function copyUnitPriceForQuantity(quantity, tiers = DEFAULT_COPY_PRICING_TIERS) {
  const q = Math.max(1, Number(quantity) || 1);
  if (q <= 1) return 0;
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

export function maxCopyTarget(currentRun = 1) {
  const run = Math.max(1, Number(currentRun) || 1);
  if (run === 1) {
    return Math.min(MAX_COPIES_PER_ORDER, MAX_COPIES_PER_USER_PER_CARD);
  }
  return Math.min(run + MAX_COPIES_PER_ORDER, MAX_COPIES_PER_USER_PER_CARD);
}

export function clampCopyQuantity(value, currentRun = 1) {
  const n = Math.floor(Number(value));
  const max = maxCopyTarget(currentRun);
  if (!Number.isFinite(n)) return COPY_QUANTITY_MIN;
  return Math.min(max, Math.max(COPY_QUANTITY_MIN, n));
}

export function copyQuantityError(value, currentRun = 1) {
  const max = maxCopyTarget(currentRun);
  if (value === "" || value === null || value === undefined) {
    return "Please enter a quantity";
  }
  const n = Number(value);
  if (!Number.isInteger(n)) {
    return "Quantity must be a whole number";
  }
  if (n < COPY_QUANTITY_MIN) {
    return "Quantity must be at least 1";
  }
  if (n > max) {
    return `Quantity must be ${max} or less`;
  }
  return null;
}

export function isValidCopyQuantity(value, currentRun = 1) {
  return copyQuantityError(value, currentRun) === null;
}

export function copyQuantitySummaryLine(quantity) {
  const q = clampCopyQuantity(quantity);
  if (q === 1) return "You will receive 1 unique card (1 of 1) in your collection.";
  return `You will receive ${q} unique cards (#1 of ${q} through #${q} of ${q}) in your collection.`;
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
  if (q >= 50) return "Collector Pack pricing — best value!";
  if (q >= 10) return "Large Bundle discount applied!";
  if (q >= 5) return "Bundle discount applied!";
  if (q >= 2) return "Small Bundle pricing applied!";
  return null;
}

export function copyOrderSavings(quantity, tierBasePrice, tiers = DEFAULT_COPY_PRICING_TIERS) {
  const q = Math.max(1, Number(quantity) || 1);
  const extra = Math.max(0, q - 1);
  const unit = copyUnitPriceForQuantity(q, tiers);
  const base = Math.max(0, Number(tierBasePrice) || 0);
  if (extra <= 0 || unit >= base) return 0;
  return Math.round(extra * (base - unit) * 100) / 100;
}

/**
 * Parse backend 400 copy-limit errors; returns warning text and corrected quantity when possible.
 */
export function parseCopyLimitError(message, currentRun = 1) {
  const text = String(message || "").trim();
  if (!text) return null;

  const perOrder = text.match(/Maximum (\d+) copies per order/i);
  if (perOrder) {
    const corrected = clampCopyQuantity(MAX_COPIES_PER_ORDER, currentRun);
    return {
      warning: `Maximum ${perOrder[1]} copies per order`,
      correctedQuantity: corrected,
    };
  }

  const listed = text.match(/Maximum (\d+) copies can be listed at once/i);
  if (listed) {
    return {
      warning: `Maximum ${listed[1]} copies can be listed at once`,
      correctedQuantity: Number(listed[1]),
    };
  }

  const owned = text.match(/You already own (\d+) copies/i);
  const addMore = text.match(/You can add up to (\d+) more/i);
  if (owned && addMore) {
    const existing = Number(owned[1]);
    const available = Number(addMore[1]);
    const corrected = clampCopyQuantity(existing + available, currentRun);
    return {
      warning: `You already own ${existing} copies of this card — you can add ${available} more`,
      correctedQuantity: corrected,
    };
  }

  if (/between 1 and 100/i.test(text)) {
    return {
      warning: "Maximum 100 copies per order",
      correctedQuantity: clampCopyQuantity(100, currentRun),
    };
  }

  return null;
}
