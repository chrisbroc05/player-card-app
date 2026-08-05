import { API_BASE_URL, authHeaders } from "../config/api";

export function generationCapBlocked(usage) {
  if (!usage) return { blocked: false, period: null };
  const period = usage.cap_hit || null;
  if (period === "daily" || period === "monthly") {
    return { blocked: true, period };
  }
  if (Number(usage.daily_remaining) <= 0) {
    return { blocked: true, period: "daily" };
  }
  if (Number(usage.monthly_remaining) <= 0) {
    return { blocked: true, period: "monthly" };
  }
  return { blocked: false, period: null };
}

export function generationCapFriendlyMessage(usage, period) {
  const hit = period || generationCapBlocked(usage).period;
  if (hit === "daily") {
    return "You've created a lot of cards today! Your limit resets at midnight. Come back tomorrow to make more.";
  }
  if (hit === "monthly") {
    const resetLabel = usage?.monthly_resets
      ? new Date(usage.monthly_resets).toLocaleDateString(undefined, {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "the 1st of next month";
    return `You've hit your monthly card limit. Your limit resets on ${resetLabel}. In the meantime, check out your collection or trade on the marketplace!`;
  }
  return "";
}

export function generationUsageFromPayload(data) {
  if (!data || typeof data !== "object") return null;
  if (!("daily_count" in data) || !("monthly_count" in data)) return null;
  return data;
}

export async function fetchGenerationUsage(token) {
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/cards/generation-usage`, {
      headers: { ...authHeaders(token) },
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return generationUsageFromPayload(data);
  } catch {
    return null;
  }
}

export function isGenerationCapResponse(status, data) {
  return status === 429 || Boolean(generationUsageFromPayload(data)?.cap_hit);
}
