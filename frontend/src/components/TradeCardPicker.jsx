import React, { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../config/api";
import CardImage from "./CardImage";
import { CARD_IMAGE_FRAME_THUMB } from "../utils/cardImageStyles";
import { isAnimatedCard } from "../utils/animationCard";

function isTradeSelectable(card, excludeIds) {
  const id = (card?.card_id || "").toUpperCase();
  if (excludeIds.has(id)) return false;
  const st = (card?.status || "active").toLowerCase();
  if (st !== "active") return false;
  if (card?.listed_on_marketplace) return false;
  return true;
}

function ineligibleReason(card, excludeIds) {
  const id = (card?.card_id || "").toUpperCase();
  if (excludeIds.has(id)) return "This listing";
  const st = (card?.status || "active").toLowerCase();
  if (st === "pending_trade") return "Pending trade";
  if (card?.listed_on_marketplace) return "Listed on marketplace";
  if (st !== "active") return "Unavailable";
  return null;
}

/**
 * Multi-select card picker from the user's collection for marketplace card trades.
 */
export default function TradeCardPicker({
  token,
  selectedIds,
  onSelectedIdsChange,
  excludeCardIds = [],
  pickerLabel = "Select cards from your collection to offer — add as many as you want",
}) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const excludeSet = useMemo(() => {
    const s = new Set();
    for (const id of excludeCardIds) {
      if (id) s.add(String(id).toUpperCase());
    }
    return s;
  }, [excludeCardIds]);

  const selectedSet = useMemo(() => {
    const s = new Set();
    for (const id of selectedIds) {
      if (id) s.add(String(id).toUpperCase());
    }
    return s;
  }, [selectedIds]);

  const loadCards = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch(`${API_BASE_URL}/cards/my-cards`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error("Could not load your collection.");
      setCards(Array.isArray(data) ? data : []);
    } catch (e) {
      setLoadError(e.message || "Failed to load collection.");
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const selectedCards = useMemo(
    () => cards.filter((c) => selectedSet.has((c.card_id || "").toUpperCase())),
    [cards, selectedSet]
  );

  function toggleCard(card) {
    const key = (card.card_id || "").toUpperCase();
    if (!isTradeSelectable(card, excludeSet)) return;
    const next = new Set(selectedSet);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectedIdsChange(Array.from(next));
  }

  function removeSelected(cardId) {
    const key = (cardId || "").toUpperCase();
    onSelectedIdsChange(selectedIds.filter((id) => (id || "").toUpperCase() !== key));
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">{pickerLabel}</p>
      {loadError ? <p className="text-sm text-rose-300">{loadError}</p> : null}
      {loading ? (
        <div className="flex justify-center py-6">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-neonTeal" />
        </div>
      ) : cards.length === 0 ? (
        <p className="text-sm text-slate-500">No cards in your collection.</p>
      ) : (
        <div className="grid max-h-[280px] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
          {cards.map((card) => {
            const selectable = isTradeSelectable(card, excludeSet);
            const selected = selectedSet.has((card.card_id || "").toUpperCase());
            const reason = ineligibleReason(card, excludeSet);
            return (
              <button
                key={card.card_id}
                type="button"
                disabled={!selectable}
                onClick={() => toggleCard(card)}
                title={reason || undefined}
                className={`rounded-lg border p-1 text-left transition ${
                  selected
                    ? "border-neonTeal bg-teal-500/15 ring-1 ring-neonTeal/50"
                    : selectable
                      ? "border-white/15 bg-cardBg hover:border-teal-500/40"
                      : "cursor-not-allowed border-white/5 bg-black/20 opacity-45"
                }`}
              >
                <CardImage
                  card={card}
                  alt={card.player_name}
                  frameClassName={CARD_IMAGE_FRAME_THUMB}
                  playOnHover={isAnimatedCard(card)}
                />
                <p className="mt-1 truncate text-[10px] font-medium text-white">{card.player_name}</p>
                <p className="truncate font-mono text-[9px] text-slate-500">{card.card_id}</p>
                {reason ? <p className="mt-0.5 text-[9px] text-slate-500">{reason}</p> : null}
              </button>
            );
          })}
        </div>
      )}

      <p className="text-sm font-medium text-slate-300">
        {selectedSet.size} card{selectedSet.size === 1 ? "" : "s"} selected
      </p>

      {selectedCards.length > 0 ? (
        <ul className="space-y-2 rounded-lg border border-white/10 bg-cardBg2 p-2">
          {selectedCards.map((c) => (
            <li key={c.card_id} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate text-white">
                {c.player_name}{" "}
                <span className="font-mono text-xs text-slate-500">{c.card_id}</span>
              </span>
              <button
                type="button"
                onClick={() => removeSelected(c.card_id)}
                className="shrink-0 rounded px-2 py-0.5 text-xs text-rose-300 hover:bg-rose-500/10"
                aria-label={`Remove ${c.player_name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
