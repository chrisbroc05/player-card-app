/** Credit load (Stripe Checkout) helpers — must match backend MIN_CREDIT_LOAD default. */

import { formatMoney } from "./marketplace";

export const MIN_CREDIT_LOAD = 10;

export function minCreditPurchaseLabel() {
  return formatMoney(MIN_CREDIT_LOAD);
}

export function minCreditPurchaseError() {
  return `Minimum purchase is ${formatMoney(MIN_CREDIT_LOAD)}`;
}

export function isValidCreditLoadAmount(amount) {
  const n = Number(amount);
  return Number.isFinite(n) && n >= MIN_CREDIT_LOAD;
}

/** Insufficient-balance prompt when user must top up via Stripe (minimum load applies). */
export function creditTopUpShortfallMessage(shortfall) {
  const need = formatMoney(shortfall);
  return `You need ${need} more. Credits load in ${formatMoney(MIN_CREDIT_LOAD)} minimums — your remaining balance carries over for future purchases.`;
}
