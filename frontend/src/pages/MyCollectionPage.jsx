import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import { API_BASE_URL, authHeaders } from "../config/api";
import CardImage from "../components/CardImage";
import { CardSharePopover } from "../components/ShareCard";
import { useAuth } from "../context/AuthContext";
import MarketplaceListingActions from "../components/MarketplaceListingActions";
import AnimateCardModal from "../components/AnimateCardModal";
import AnimationProgressBanner from "../components/AnimationProgressBanner";
import { authFetch, formatApiError } from "../utils/authFetch";
import { canAnimateCard, isAnimatedCard, isAnimationInProgress } from "../utils/animationCard";
import { vaultTierBadge, rarityDisplay } from "../utils/tierStyles";
import { CARD_IMAGE_FRAME, CARD_IMAGE_FRAME_ANIMATED } from "../utils/cardImageStyles";

export default function MyCollectionPage() {
  const { token, user, initializing, refreshIncomingTradeCount, refreshNavBadges } = useAuth();
  const [cards, setCards] = useState([]);
  const [listingByCardId, setListingByCardId] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelKey, setCancelKey] = useState("");
  const [marketplaceBusyId, setMarketplaceBusyId] = useState("");
  const [animateModalCard, setAnimateModalCard] = useState(null);
  const [animateBusyId, setAnimateBusyId] = useState("");
  const [bannerDismissed, setBannerDismissed] = useState({});

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
      const listRes = await authFetch(token, "/marketplace/my-listings");
      if (listRes.res.ok) {
        const listings = await listRes.res.json().catch(() => []);
        const map = {};
        if (Array.isArray(listings)) {
          for (const row of listings) {
            if (row.card_id) map[row.card_id] = row;
          }
        }
        setListingByCardId(map);
      }
    } catch (e) {
      setError(e.message || "Failed to fetch.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  async function listCardOnMarketplace(cardId, askingPrice) {
    if (!token) return;
    setMarketplaceBusyId(cardId);
    setError("");
    try {
      const { res, unauthorized } = await authFetch(token, "/marketplace/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_id: cardId, asking_price: askingPrice }),
      });
      if (unauthorized) throw new Error("Session expired.");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Could not list card."));
      await loadCards();
      refreshNavBadges?.();
    } catch (e) {
      setError(e.message || "Could not list card.");
      throw e;
    } finally {
      setMarketplaceBusyId("");
    }
  }

  async function unlistCardFromMarketplace(cardId) {
    if (!token) return;
    setMarketplaceBusyId(cardId);
    setError("");
    try {
      const { res, unauthorized } = await authFetch(token, "/marketplace/unlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_id: cardId }),
      });
      if (unauthorized) throw new Error("Session expired.");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Could not remove listing."));
      await loadCards();
      refreshNavBadges?.();
    } catch (e) {
      setError(e.message || "Could not remove listing.");
      throw e;
    } finally {
      setMarketplaceBusyId("");
    }
  }

  const displayRows = useMemo(() => {
    const arr = [...cards];
    arr.sort((a, b) => {
      const ia = String(a.image_url || "");
      const ib = String(b.image_url || "");
      if (ia !== ib) return ia.localeCompare(ib);
      return (Number(a.edition_number) || 0) - (Number(b.edition_number) || 0);
    });
    const counts = {};
    for (const c of arr) {
      const k = String(c.image_url || c.card_id);
      counts[k] = (counts[k] || 0) + 1;
    }
    return arr.map((card, idx) => {
      const k = String(card.image_url || card.card_id);
      const prev = idx > 0 ? arr[idx - 1] : null;
      const prevK = prev ? String(prev.image_url || prev.card_id) : null;
      const isFirstInGroup = prevK !== k;
      const groupSize = counts[k] || 1;
      return { card, stackCount: isFirstInGroup && groupSize > 1 ? groupSize : null };
    });
  }, [cards]);

  useEffect(() => {
    if (!token || initializing) return;
    loadCards();
  }, [token, initializing, loadCards]);

  useEffect(() => {
    if (!token) return undefined;
    const needsPoll = cards.some((c) => isAnimationInProgress(c));
    if (!needsPoll) return undefined;
    const iv = setInterval(() => {
      loadCards();
    }, 10000);
    return () => clearInterval(iv);
  }, [token, cards, loadCards]);

  useEffect(() => {
    for (const c of cards) {
      const st = (c.animation_status || "").toLowerCase();
      if (st === "completed" && !bannerDismissed[c.card_id]) {
        const t = setTimeout(() => {
          setBannerDismissed((prev) => ({ ...prev, [c.card_id]: true }));
        }, 3000);
        return () => clearTimeout(t);
      }
    }
    return undefined;
  }, [cards, bannerDismissed]);

  async function startAnimateUpgrade(card, motionId) {
    if (!token) return;
    setAnimateBusyId(card.card_id);
    setError("");
    try {
      const { res, unauthorized } = await authFetch(token, `/cards/${encodeURIComponent(card.card_id)}/animate-upgrade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motion_id: motionId }),
      });
      if (unauthorized) throw new Error("Session expired.");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Could not start animation."));
      setAnimateModalCard(null);
      await loadCards();
    } catch (e) {
      setError(e.message || "Could not start animation.");
    } finally {
      setAnimateBusyId("");
    }
  }

  function renderAnimationBanner(card) {
    const st = (card.animation_status || "").toLowerCase();
    if (isAnimatedCard(card)) return null;
    if (st === "pending" || st === "processing") {
      return <AnimationProgressBanner variant="progress" />;
    }
    if (st === "completed" && !bannerDismissed[card.card_id]) {
      return <AnimationProgressBanner variant="success" />;
    }
    if (st === "failed") {
      return <AnimationProgressBanner variant="failed" />;
    }
    return null;
  }

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
            {displayRows.map(({ card, stackCount }) => {
              const badge = vaultTierBadge(card.tier);
              const pending = (card.status || "active") === "pending_trade";
              return (
                <article
                  key={card.card_id}
                  className={`group rounded-2xl border border-white/10 bg-cardBg p-3 shadow-lg transition duration-300 hover:border-white/20 ${badge.glow} ${
                    pending ? "opacity-70" : "hover:scale-[1.02]"
                  }`}
                >
                  <div
                    className={`relative ${isAnimatedCard(card) ? CARD_IMAGE_FRAME_ANIMATED : CARD_IMAGE_FRAME}`}
                  >
                    <CardImage
                      card={card}
                      alt={card.player_name}
                      cacheBust={card.created_at}
                      playOnHover
                      forcePlay={isAnimatedCard(card)}
                    />
                    {stackCount ? (
                      <span className="absolute left-2 top-2 z-10 rounded-md border border-white/15 bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-slate-200 backdrop-blur-sm">
                        x{stackCount}
                      </span>
                    ) : null}
                    <div className="absolute right-2 top-2 z-10">
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
                    <span
                      className="inline-block rounded border border-[#2a2a2a] bg-[#1a1a1a] px-2 py-0.5 text-[11px] text-[#aaaaaa]"
                      style={{ padding: "2px 8px", borderRadius: "4px" }}
                    >
                      #{card.edition_number} of {card.print_run}
                    </span>
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
                    {renderAnimationBanner(card)}
                    {canAnimateCard(card) ? (
                      <button
                        type="button"
                        onClick={() => setAnimateModalCard(card)}
                        className="inline-flex min-h-[40px] w-full items-center justify-center rounded-lg border border-violet-500/40 bg-violet-500/15 px-3 py-2 text-sm font-medium text-violet-100 transition hover:border-violet-400/60"
                      >
                        Animate This Card
                      </button>
                    ) : null}
                    <MarketplaceListingActions
                      card={card}
                      listingInfo={listingByCardId[card.card_id]}
                      busy={marketplaceBusyId === card.card_id}
                      onList={(price) => listCardOnMarketplace(card.card_id, price)}
                      onUnlist={() => unlistCardFromMarketplace(card.card_id)}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <AnimateCardModal
        card={animateModalCard}
        open={Boolean(animateModalCard)}
        busy={Boolean(animateBusyId)}
        onClose={() => setAnimateModalCard(null)}
        onConfirm={(motionId) => startAnimateUpgrade(animateModalCard, motionId)}
      />

      <AppFooter />
    </div>
  );
}
