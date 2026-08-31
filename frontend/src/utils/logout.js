import { AUTH_TOKEN_STORAGE_KEY } from "../config/api";
import { clearActivityTracking } from "./activityTracker";

/**
 * Clear auth session storage and redirect to login.
 * Biometric flags (biometric_enabled, biometric_dismissed, webauthn_credential_id)
 * persist so Face ID remains available on the login page after logout.
 */
export function performLogout(authLogout) {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  clearActivityTracking();

  if (typeof authLogout === "function") {
    authLogout();
  }

  sessionStorage.clear();
  window.location.href = "/login";
}
