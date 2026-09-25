import { API_BASE_URL } from "../config/api";
import { formatMoney } from "./marketplace";

const ORDER_TIERS = ["rookie", "all_star", "legends"];

export async function fetchGenerationPrice(tier, { cardType = "static", animated = false } = {}) {
  const key = tier || "rookie";
  let type = "static";
  if (cardType === "highlight") type = "highlight";
  else if (cardType === "animated") type = "animated";
  const params = new URLSearchParams({
    tier: key,
    card_type: type,
    animated: animated ? "true" : "false",
  });
  const res = await fetch(`${API_BASE_URL}/cards/generation-price?${params.toString()}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.detail || "Could not load pricing.");
  }
  return data;
}

export async function fetchAllTierCreationPrices(cardType = "static") {
  const quotes = await Promise.all(
    ORDER_TIERS.map((tier) => fetchGenerationPrice(tier, { cardType })),
  );
  return Object.fromEntries(ORDER_TIERS.map((tier, index) => [tier, quotes[index]]));
}

export function formatTierStepPriceLabel(pricing, cardType) {
  if (!pricing) return null;

  const total = Number(pricing.card_creation_price ?? pricing.total) || 0;
  const base = Number(pricing.base_price) || 0;
  const highlightFee = Number(pricing.highlight_fee ?? pricing.highlight_card_price) || 0;
  const animatedFee = Number(pricing.animated_fee ?? pricing.animated_upgrade_price) || 0;
  const totalLabel = formatMoney(total);

  if (cardType === "highlight") {
    return `${totalLabel} (${formatMoney(base)} + ${formatMoney(highlightFee)} highlight)`;
  }
  if (cardType === "animated") {
    return `${totalLabel} (${formatMoney(base)} + ${formatMoney(animatedFee)} animated)`;
  }
  return totalLabel;
}

export function priceLabel(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return "FREE";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}
