import { canAnimateCard } from "./animationCard";
import { hasAnimatedUpgradeForCard } from "./collectionCongrats";

const SESSION_KEY = "fl_new_card_celebration_events";

function readShownEvents() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function celebrationEventId(source, cardId) {
  return `${source}:${cardId}`;
}

export function wasCelebrationShown(eventId) {
  if (!eventId) return false;
  return readShownEvents().includes(eventId);
}

export function markCelebrationShown(eventId) {
  if (!eventId) return;
  const events = readShownEvents();
  if (events.includes(eventId)) return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...events, eventId]));
  } catch {
    /* ignore quota / private mode */
  }
}

export function headlineForSource(source) {
  if (source === "purchased") return "Card secured! It's yours now.";
  if (source === "traded") return "New card incoming! Trade complete.";
  return "Your card is official!";
}

export function sourceLineForAcquisition({ source, counterparty, amount, formatMoney }) {
  const name = (counterparty || "").trim();
  if (source === "purchased") {
    const price = amount != null ? formatMoney(amount) : "";
    if (name && price) return `Purchased from @${name} for ${price}`;
    if (name) return `Purchased from @${name}`;
    return "Purchased on the marketplace";
  }
  if (source === "traded") {
    if (name) return `Received from @${name}`;
    return "Received via trade";
  }
  return "Added to your collection";
}

export function secondaryLabelForSource(source) {
  if (source === "purchased") return "Back to Marketplace";
  if (source === "traded") return "Back to Trades";
  return null;
}

export function secondaryPathForSource(source) {
  if (source === "purchased") return "/marketplace";
  if (source === "traded") return "/trades";
  return null;
}

export function shouldShowAnimateUpsell(card, userCards) {
  if (!card || !canAnimateCard(card)) return false;
  return !hasAnimatedUpgradeForCard(userCards, card.card_id);
}
