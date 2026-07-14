import { isAnimatedCard } from "./animationCard";

const STORAGE_KEY = "fl_collection_congrats_shown";

function readShownIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function wasCollectionCongratsShown(cardId) {
  if (!cardId) return false;
  return readShownIds().includes(cardId);
}

export function markCollectionCongratsShown(cardId) {
  if (!cardId) return;
  const ids = readShownIds();
  if (ids.includes(cardId)) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids, cardId]));
  } catch {
    /* ignore quota / private mode */
  }
}

export function hasAnimatedUpgradeForCard(cards, staticCardId) {
  if (!staticCardId) return false;
  const prefix = `animated-from:${staticCardId}`;
  return (cards || []).some((card) => {
    if (!isAnimatedCard(card)) return false;
    const style = String(card.style || "").trim();
    return style === prefix;
  });
}

export function tierConfettiClass(tier) {
  const t = String(tier || "").toLowerCase();
  if (t === "legends") return "collection-confetti--legends";
  if (t === "allstar") return "collection-confetti--allstar";
  return "collection-confetti--rookie";
}
