const LOCAL_API_BASE_URL = "http://127.0.0.1:8766";
const PROD_API_BASE_URL = "https://player-card-backend.onrender.com";

function isLocalhostHost() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

function normalizeApiBase(raw) {
  const s = (raw || "").trim().replace(/\/+$/, "");
  return s || null;
}

export const API_BASE_URL =
  normalizeApiBase(import.meta.env.VITE_API_BASE_URL) ||
  (isLocalhostHost() ? LOCAL_API_BASE_URL : PROD_API_BASE_URL);

export const AUTH_TOKEN_STORAGE_KEY = "fl_access_token";
export const ADMIN_TOKEN_STORAGE_KEY = "adminToken";

/** Headers for authenticated admin API calls. */
export function adminHeaders(token) {
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
/** Headers for authenticated API calls (omit if no token). */
export function authHeaders(token) {
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export function toApiUrl(pathOrUrl) {
  if (!pathOrUrl) return "";
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  const base = (API_BASE_URL || "").replace(/\/+$/, "");
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${path}`;
}
