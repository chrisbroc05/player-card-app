import { AUTH_TOKEN_STORAGE_KEY } from "../config/api";
import {
  BIOMETRIC_CREDENTIAL_ID_KEY,
  BIOMETRIC_DISMISSED_KEY,
  BIOMETRIC_ENABLED_KEY,
} from "./webauthn";
import { clearActivityTracking } from "./activityTracker";

/**
 * Clear all auth storage and redirect to login.
 * Use after AuthContext logout() to reset React state, or pass logout from useAuth().
 */
export function performLogout(authLogout) {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  clearActivityTracking();
  localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
  localStorage.removeItem(BIOMETRIC_CREDENTIAL_ID_KEY);
  localStorage.removeItem(BIOMETRIC_DISMISSED_KEY);

  if (typeof authLogout === "function") {
    authLogout();
  }

  sessionStorage.clear();
  window.location.href = "/login";
}
