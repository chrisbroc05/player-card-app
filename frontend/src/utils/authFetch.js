import { API_BASE_URL, AUTH_TOKEN_STORAGE_KEY, authHeaders } from "../config/api";

export function formatApiError(detail, fallback) {
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const msgs = detail.map((item) => (typeof item === "string" ? item : item?.msg)).filter(Boolean);
    return msgs.length ? msgs.join(" | ") : fallback;
  }
  if (typeof detail === "object" && typeof detail.message === "string") return detail.message;
  return fallback;
}

/** Build an Error from a marketplace list/connect API detail payload. */
export function marketplaceListErrorFromDetail(detail, fallback = "Could not list card.") {
  if (
    detail &&
    typeof detail === "object" &&
    detail.code === "stripe_onboarding_incomplete"
  ) {
    const err = new Error(detail.message || "Complete Stripe onboarding to sell on the marketplace.");
    err.connectRequired = true;
    err.connectCode = detail.code;
    return err;
  }
  const err = new Error(formatApiError(detail, fallback));
  err.connectRequired = false;
  return err;
}

/**
 * Authenticated fetch; on 401 clears token and returns { unauthorized: true }.
 */
export async function authFetch(token, path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...authHeaders(token),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    return { res, unauthorized: true };
  }
  return { res, unauthorized: false };
}
