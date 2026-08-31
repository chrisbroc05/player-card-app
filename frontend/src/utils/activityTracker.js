import { BIOMETRIC_ENABLED_KEY } from "./webauthn";

export const LAST_ACTIVE_KEY = "last_active_timestamp";
export const INACTIVITY_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export function updateLastActive() {
  try {
    localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
  } catch {
    // ignore storage errors
  }
}

export function isBiometricRequired() {
  try {
    const biometricEnabled = localStorage.getItem(BIOMETRIC_ENABLED_KEY);
    if (!biometricEnabled) return false;

    const lastActive = localStorage.getItem(LAST_ACTIVE_KEY);
    if (!lastActive) return true;

    const elapsed = Date.now() - Number.parseInt(lastActive, 10);
    if (Number.isNaN(elapsed)) return true;

    return elapsed > INACTIVITY_THRESHOLD_MS;
  } catch {
    return false;
  }
}

export function clearBiometricRequired() {
  updateLastActive();
}

export function clearActivityTracking() {
  try {
    localStorage.removeItem(LAST_ACTIVE_KEY);
  } catch {
    // ignore
  }
}
