import { API_BASE_URL, authHeaders } from "../config/api";

export function filterListableCopies(copies = []) {
  return (Array.isArray(copies) ? copies : []).filter(
    (copy) => (copy?.status || "active") === "active" && !copy?.listed_on_marketplace
  );
}

export async function fetchListableCopies(cardId, token) {
  if (!cardId) return [];
  const res = await fetch(`${API_BASE_URL}/cards/${encodeURIComponent(cardId)}/copies`, {
    headers: { ...authHeaders(token) },
  });
  if (!res.ok) {
    throw new Error("Could not load copies for this card.");
  }
  const data = await res.json().catch(() => []);
  return filterListableCopies(data);
}

export function pickDefaultCopyId(listableCopies, preferredCardId) {
  if (!listableCopies?.length) return null;
  const preferred = listableCopies.find((c) => c.card_id === preferredCardId);
  if (preferred) return preferred.card_id;
  const original = listableCopies.find((c) => Number(c.edition_number) === 1);
  return original?.card_id || listableCopies[0]?.card_id || null;
}

export function pickDefaultMultiSelection(listableCopies, preferredCardId) {
  const preferred = listableCopies?.find((c) => c.card_id === preferredCardId);
  return preferred ? [preferred.card_id] : [];
}
