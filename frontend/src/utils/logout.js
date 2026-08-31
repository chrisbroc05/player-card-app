import { AUTH_TOKEN_STORAGE_KEY } from "../config/api";

/**
 * Clear all auth storage and redirect to login.
 * Use after AuthContext logout() to reset React state, or pass logout from useAuth().
 */
export function performLogout(authLogout) {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  if (typeof authLogout === "function") {
    authLogout();
  }

  sessionStorage.clear();
  window.location.href = "/login";
}
