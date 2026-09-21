const LAST_LOGIN_KEY = "profile_last_login";
const SESSION_START_KEY = "profile_session_start";

export function initProfileSession({ isFreshAuth = false } = {}) {
  try {
    const now = Date.now().toString();
    if (isFreshAuth) {
      const prevStart = sessionStorage.getItem(SESSION_START_KEY);
      if (prevStart) {
        localStorage.setItem(LAST_LOGIN_KEY, prevStart);
      } else if (!localStorage.getItem(LAST_LOGIN_KEY)) {
        localStorage.setItem(LAST_LOGIN_KEY, now);
      }
      sessionStorage.setItem(SESSION_START_KEY, now);
      return;
    }
    if (!sessionStorage.getItem(SESSION_START_KEY)) {
      sessionStorage.setItem(SESSION_START_KEY, now);
    }
  } catch {
    /* ignore storage errors */
  }
}

export function clearProfileSession() {
  try {
    const start = sessionStorage.getItem(SESSION_START_KEY);
    if (start) {
      localStorage.setItem(LAST_LOGIN_KEY, start);
    }
    sessionStorage.removeItem(SESSION_START_KEY);
  } catch {
    /* ignore */
  }
}

export function getLastLoginTimestamp() {
  try {
    const raw = localStorage.getItem(LAST_LOGIN_KEY);
    if (!raw) return null;
    const n = Number.parseInt(raw, 10);
    return Number.isNaN(n) ? null : n;
  } catch {
    return null;
  }
}

export function getSessionStartTimestamp() {
  try {
    const raw = sessionStorage.getItem(SESSION_START_KEY);
    if (!raw) return null;
    const n = Number.parseInt(raw, 10);
    return Number.isNaN(n) ? null : n;
  } catch {
    return null;
  }
}

export function formatLastLogin(ts) {
  if (!ts) return "Last login: —";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "Last login: —";
  const now = new Date();
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return `Last login: Today ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Last login: Yesterday ${time}`;
  const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `Last login: ${date} ${time}`;
}

export function formatSessionDuration(startTs) {
  if (!startTs) return "Session: —";
  const elapsedMs = Math.max(0, Date.now() - startTs);
  const totalMin = Math.floor(elapsedMs / 60000);
  if (totalMin < 60) return `Session: ${totalMin} min`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return mins > 0 ? `Session: ${hours}h ${mins}m` : `Session: ${hours}h`;
}

export function getProfileInitials(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return "?";
}
