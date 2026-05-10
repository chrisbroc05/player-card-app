const LOCAL_API_BASE_URL = "http://127.0.0.1:8766";
const PROD_API_BASE_URL = "https://player-card-backend.onrender.com";

function isLocalhostHost() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || (isLocalhostHost() ? LOCAL_API_BASE_URL : PROD_API_BASE_URL);

export function toApiUrl(pathOrUrl) {
  if (!pathOrUrl) return "";
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  if (pathOrUrl.startsWith("/")) {
    return `${API_BASE_URL}${pathOrUrl}`;
  }
  return `${API_BASE_URL}/${pathOrUrl}`;
}
