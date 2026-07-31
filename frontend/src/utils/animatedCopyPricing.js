import { formatMoney } from "./marketplace";

/** Mirror backend animated_studio_total_price. */
export function animatedStudioTotalPrice(quantity, pricing = {}) {
  const q = Math.max(1, Math.min(100, Number(quantity) || 1));
  const base = Number(pricing.animated_upgrade_price ?? pricing.base_price ?? 10);
  const extra = Math.max(0, q - 1);
  if (extra === 0) {
    return {
      quantity: q,
      basePrice: base,
      extraCopies: 0,
      extraUnitPrice: 0,
      extraTotal: 0,
      total: Math.round(base * 100) / 100,
    };
  }
  const copyPricing = pricing.animated_copy_pricing || {};
  const unit =
    q >= 5
      ? Number(copyPricing.additional_5_plus ?? 1.5)
      : Number(copyPricing.additional_2_to_4 ?? 2);
  const extraTotal = Math.round(extra * unit * 100) / 100;
  return {
    quantity: q,
    basePrice: base,
    extraCopies: extra,
    extraUnitPrice: unit,
    extraTotal,
    total: Math.round((base + extraTotal) * 100) / 100,
  };
}

export function animatedStudioPriceLine(quantity, pricing) {
  const p = animatedStudioTotalPrice(quantity, pricing);
  const label = p.quantity === 1 ? "1 animated copy" : `${p.quantity} animated copies`;
  return `${label} — ${formatMoney(p.total)} total`;
}

export function animatedStudioBreakdown(quantity, pricing) {
  const p = animatedStudioTotalPrice(quantity, pricing);
  if (p.extraCopies === 0) {
    return `Base animated card (${formatMoney(p.basePrice)}) includes your first copy.`;
  }
  return (
    `${formatMoney(p.basePrice)} base + ${p.extraCopies} additional ` +
    `${p.extraCopies === 1 ? "copy" : "copies"} × ${formatMoney(p.extraUnitPrice)} = ${formatMoney(p.total)}`
  );
}
