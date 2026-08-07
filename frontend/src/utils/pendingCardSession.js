const DISCARDED_SESSIONS_KEY = "fl_pending_discarded_sessions";

function readDiscardedSessionIds() {
  try {
    const raw = sessionStorage.getItem(DISCARDED_SESSIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function discardedCardKey(cardId) {
  return `discarded_card_${cardId || ""}`;
}

/** Remember a discarded preview session for the browser session. */
export function markPendingSessionDiscarded(sessionId) {
  if (!sessionId) return;
  const ids = readDiscardedSessionIds();
  if (ids.includes(sessionId)) return;
  sessionStorage.setItem(DISCARDED_SESSIONS_KEY, JSON.stringify([...ids, sessionId]));
  sessionStorage.setItem("pendingCardDiscarded", "true");
}

/** Mark individual preview cards as discarded for this browser session. */
export function markPendingCardsDiscarded(cardIds, sessionId) {
  if (Array.isArray(cardIds)) {
    cardIds.filter(Boolean).forEach((cardId) => {
      sessionStorage.setItem(discardedCardKey(cardId), "true");
    });
  }
  markPendingSessionDiscarded(sessionId);
}

export function isPendingSessionDiscarded(sessionId) {
  if (!sessionId) return false;
  return readDiscardedSessionIds().includes(sessionId);
}

export function isPendingCardDiscarded(cardId) {
  if (!cardId) return false;
  return sessionStorage.getItem(discardedCardKey(cardId)) === "true";
}

/** True when any pending card was discarded this browser session. */
export function wasPendingCardDiscardedThisSession() {
  return sessionStorage.getItem("pendingCardDiscarded") === "true";
}

/** Keep only previews with a valid pending preview status. */
export function filterValidPendingPreviews(previews) {
  if (!Array.isArray(previews)) return [];
  return previews.filter((preview) => {
    if (isPendingCardDiscarded(preview?.card_id)) return false;
    const status = String(preview?.status || "preview").toLowerCase();
    return status === "preview" || status === "pending";
  });
}
