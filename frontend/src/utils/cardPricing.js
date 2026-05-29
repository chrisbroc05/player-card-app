import { API_BASE_URL } from "../config/api";

export async function fetchGenerationPrice(tier) {
  const key = tier || "rookie";
  const res = await fetch(
    `${API_BASE_URL}/cards/generation-price?tier=${encodeURIComponent(key)}`
  );
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
