import React, { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import { API_BASE_URL, authHeaders } from "../config/api";
import CardImage from "../components/CardImage";
import { CardSharePopover } from "../components/ShareCard";
import { useAuth } from "../context/AuthContext";
import { vaultTierBadge, formatEditionShort, rarityDisplay } from "../utils/tierStyles";

export default function MyCollectionPage() {
  const { token, user, initializing, refreshIncomingTradeCount } = useAuth();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelKey, setCancelKey] = useState("");

  const loadCards = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/cards/my-cards`, {
        headers: { ...authHeaders(token) },
      });
      if (!res.ok) throw new Error("Could not load your collection.");
      const data = await res.json();
      setCards(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Failed to fetch.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token || initializing) return;
    loadCards();
  }, [token, initializing, loadCards]);

  async function cancelTradeForCard(card) {
    if (!token || !card?.pending_trade_offer_id) return;
    setCancelKey(card.card_id);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/trades/${card.pending_trade_offer_id}/cancel`, {
        method: "POST",
        headers: { ...authHeaders(token) },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data?.detail === "string" ? data.detail : "Cancel failed.");
      await loadCards();
      refreshIncomingTradeCount?.();
    } catch (e) {
      setError(e.message || "Cancel failed.");
    } finally {
      setCancelKey("");
    }
  }

  if (!initializing && !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-appBg text-slate-100">
      <AppHeader />

      <main className="mx-auto w-full max-w-6xl px-3 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 text-center sm:text-left">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">My Collection</h2>
          {user ? (
            <p className="mt-2 text-sm text-slate-400">
              Signed in as <span className="font-medium text-slate-200">{user.display_name}</span>
            </p>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>
        ) : null}

        {initializing || loading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-neonBlue" />
          </div>
        ) : cards.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-cardBg/50 px-6 py-16 text-center">
            <p className="text-lg text-slate-300">You haven&apos;t created any cards yet.</p>
            <p className="mt-2 text-sm text-slate-500">Create your first one!</p>
            <Link
              to="/"
              className="mt-6 inline-flex min-h-[46px] items-center justify-center rounded-xl bg-neonBlue px-6 py-2.5 text-sm font-medium text-slate-950"
            >
              Create a card
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => {
              const badge = vaultTierBadge(card.tier);
              const pending = (card.status || "active") === "pending_trade";
              return (
                <article
                  key={card.card_id}
                  className={`group rounded-2xl border border-white/10 bg-cardBg p-3 shadow-lg transition duration-300 hover:border-white/20 ${badge.glow} ${
                    pending ? "opacity-70" : "hover:scale-[1.02]"
                  }`}
                >
                  <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/30">
                    <CardImage
                      imageUrl={card.image_url}
                      alt={card.player_name}
                      cacheBust={card.created_at}
                      className="aspect-[3/4] w-full object-cover transition duration-300 group-hover:brightness-110"
                    />
                    <div className="absolute right-2 top-2">
                      <CardSharePopover card={card} />
                    </div>
                  </div>
                  <div className="mt-3 space-y-2 px-1">
                    <p className="truncate font-medium text-white">{card.player_name}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.pill}`}>
                        {badge.label}
                      </span>
                      <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-slate-300">
                        {rarityDisplay(card.rarity)}
                      </span>
                      {pending ? (
                        <span className="rounded-full border border-[#f59e0b]/50 bg-[#f59e0b]/15 px-2 py-0.5 text-[11px] font-semibold text-[#fbbf24]">
                          Pending Trade
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-400">{formatEditionShort(card.edition_number, card.print_run)}</p>
                    <Link
                      to={`/card/${encodeURIComponent(card.shareable_slug)}`}
                      className="mt-2 inline-flex min-h-[40px] w-full items-center justify-center rounded-lg border border-white/20 bg-cardBg2 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-neonBlue/50 hover:text-white"
                    >
                      View Card
                    </Link>
                    {pending && card.pending_trade_offer_id ? (
                      <button
                        type="button"
                        disabled={cancelKey === card.card_id}
                        onClick={() => cancelTradeForCard(card)}
                        className="mt-2 inline-flex min-h-[40px] w-full items-center justify-center rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-white/30 hover:bg-white/10 disabled:opacity-50"
                      >
                        {cancelKey === card.card_id ? "Cancelling…" : "Cancel Trade"}
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <AppFooter />
    </div>
  );
}
