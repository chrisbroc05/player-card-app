import { API_BASE_URL } from "../config/api";

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
