import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import { API_BASE_URL, authHeaders } from "../config/api";
import CardImage from "../components/CardImage";
import { CardSharePopover } from "../components/ShareCard";
import { useAuth } from "../context/AuthContext";
import MarketplaceListingActions, { ListedSuccessModal } from "../components/MarketplaceListingActions";
import AnimateCardModal from "../components/AnimateCardModal";
import AnimationLoadingScreen from "../components/AnimationLoadingScreen";
import AnimationProgressBanner from "../components/AnimationProgressBanner";
import GenerationCapNotice from "../components/GenerationCapNotice";
import CollectionToast from "../components/CollectionToast";
import DeleteCardModal from "../components/DeleteCardModal";
import { authFetch, formatApiError } from "../utils/authFetch";
import { canAnimateCard, isAnimatedCard, isAnimationInProgress } from "../utils/animationCard";
import { cardMediaFrameClass, cardPlaysVideoOnHover } from "../utils/highlightCard";
import { vaultTierBadge } from "../utils/tierStyles";
import { scrollAfterPaint } from "../utils/smoothScroll";
import { generationUsageFromPayload } from "../utils/generationUsage";

export default function MyCollectionPage() {
  const { token, user, initializing, refreshIncomingTradeCount, refreshNavBadges } = useAuth();
  const navigate = useNavigate();
  const [cards, setCards] = useState([]);
  const [listingByCardId, setListingByCardId] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelKey, setCancelKey] = useState("");
  const [marketplaceBusyId, setMarketplaceBusyId] = useState("");
  const [animateModalCard, setAnimateModalCard] = useState(null);
  const [animateBusyId, setAnimateBusyId] = useState("");
  const [animationLoadingCardId, setAnimationLoadingCardId] = useState(null);
  const animationLoadingCardIdRef = useRef(null);
  const animationSourceCardRef = useRef(null);
  const lastAnimateMotionRef = useRef("");
  const [bannerDismissed, setBannerDismissed] = useState({});
  const [generationCapUsage, setGenerationCapUsage] = useState(null);
  const [deleteModalCard, setDeleteModalCard] = useState(null);
  const [deleteBusyId, setDeleteBusyId] = useState("");
  const [toast, setToast] = useState({ message: "", variant: "success" });
  const [listSuccessOpen, setListSuccessOpen] = useState(false);
  const animationFocusRef = useRef(null);

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

  async function listCardOnMarketplace(cardId, askingPrice, isPriority = false) {
    if (!token) return;
    setMarketplaceBusyId(cardId);
    setError("");
    try {
      const { res, unauthorized } = await authFetch(token, "/marketplace/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_id: cardId, asking_price: askingPrice, is_priority: Boolean(isPriority) }),
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

  useEffect(() => {
    if (animationLoadingCardId) {
      scrollAfterPaint(animationFocusRef.current);
    }
  }, [animationLoadingCardId]);

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
      if (res.status === 429) {
        const usage = generationUsageFromPayload(data);
        if (usage) setGenerationCapUsage(usage);
        setAnimateModalCard(null);
        return;
      }
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Could not start animation."));
      const newCardId = data?.card_id;
      if (!newCardId) throw new Error("Animation started but no card id was returned.");
      setAnimateModalCard(null);
      lastAnimateMotionRef.current = motionId;
      animationLoadingCardIdRef.current = newCardId;
      animationSourceCardRef.current = card;
      setAnimationLoadingCardId(newCardId);
    } catch (e) {
      setError(e.message || "Could not start animation.");
    } finally {
      setAnimateBusyId("");
    }
  }

  const handleAnimationUpgradeComplete = useCallback(async () => {
    await loadCards();
    animationLoadingCardIdRef.current = null;
    animationSourceCardRef.current = null;
    setAnimationLoadingCardId(null);
    showToast("Your animated card was added to your collection!");
  }, [loadCards]);

  const handleAnimationUpgradeFailed = useCallback(() => {
    loadCards();
  }, [loadCards]);

  const handleAnimationUpgradeRetry = useCallback(async () => {
    const cardId = animationLoadingCardIdRef.current || animationLoadingCardId;
    const motionId = lastAnimateMotionRef.current;
    if (!token || !cardId || !motionId) {
      throw new Error("Could not retry animation.");
    }
    const { res, unauthorized } = await authFetch(token, `/cards/${encodeURIComponent(cardId)}/animate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motion_id: motionId }),
    });
    if (unauthorized) throw new Error("Session expired.");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(formatApiError(data?.detail, "Could not restart animation."));
  }, [animationLoadingCardId, token]);

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

  function showToast(message, variant = "success") {
    setToast({ message, variant });
    window.setTimeout(() => setToast({ message: "", variant: "success" }), 2500);
  }

  function canDeleteCard(card) {
    if (!user?.id || card.owner_id !== user.id) return false;
    if ((card.status || "active") === "pending_trade") return false;
    if (listingByCardId[card.card_id]) return false;
    return true;
  }

  async function confirmDeleteCard() {
    const card = deleteModalCard;
    if (!token || !card?.card_id) return;
    setDeleteBusyId(card.card_id);
    setError("");
    try {
      const { res, unauthorized } = await authFetch(
        token,
        `/cards/${encodeURIComponent(card.card_id)}`,
        { method: "DELETE" }
      );
      if (unauthorized) throw new Error("Session expired.");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Could not delete card."));
      setCards((prev) => prev.filter((c) => c.card_id !== card.card_id));
      setListingByCardId((prev) => {
        const next = { ...prev };
        delete next[card.card_id];
        return next;
      });
      setDeleteModalCard(null);
      showToast("Card deleted successfully");
      refreshNavBadges?.();
    } catch (e) {
      setDeleteModalCard(null);
      showToast(e.message || "Could not delete card.", "error");
    } finally {
      setDeleteBusyId("");
    }
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
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>
        ) : null}

        {generationCapUsage?.cap_hit ? (
          <GenerationCapNotice usage={generationCapUsage} period={generationCapUsage.cap_hit} className="mb-4" />
        ) : null}

        {animationLoadingCardId ? (
          <section
            ref={animationFocusRef}
            className="scroll-focus-target animate-fadeUp rounded-2xl border border-white/10 bg-cardBg p-4 shadow-xl shadow-black/30 sm:p-6"
          >
            <AnimationLoadingScreen
              cardId={animationLoadingCardId}
              token={token}
              tier={animationSourceCardRef.current?.tier || "rookie"}
              theme={animationSourceCardRef.current?.theme || animationSourceCardRef.current?.special_theme || ""}
              playerName={animationSourceCardRef.current?.player_name || ""}
              teamName={animationSourceCardRef.current?.team_name || ""}
              cardImageUrl={animationSourceCardRef.current?.image_url || ""}
              card={animationSourceCardRef.current}
              onAddToCollection={handleAnimationUpgradeComplete}
              onFailed={handleAnimationUpgradeFailed}
              onRetry={handleAnimationUpgradeRetry}
              failureCreditMessage="Animation failed. Please contact support for assistance with your account."
            />
          </section>
        ) : initializing || loading ? (
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
          <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {displayRows.map(({ card, stackCount }) => {
              const badge = vaultTierBadge(card.tier);
              const pending = (card.status || "active") === "pending_trade";
              const showDelete = canDeleteCard(card);
              const videoCard = cardPlaysVideoOnHover(card);
              return (
                <article
                  key={card.card_id}
                  className={`group rounded-2xl border border-white/10 bg-cardBg p-3 shadow-lg transition duration-300 hover:border-white/20 ${badge.glow} ${
                    pending ? "opacity-70" : videoCard ? "" : "hover:scale-[1.02]"
                  }`}
                >
                  <div className="relative min-h-[280px] sm:min-h-[320px]">
                    <CardImage
                      card={card}
                      alt={card.player_name}
                      cacheBust={card.created_at}
                      frameClassName={`${cardMediaFrameClass(card)} w-full`}
                      playOnHover
                      showInfoBanner
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
                    {pending ? (
                      <span className="inline-flex rounded-full border border-[#f59e0b]/50 bg-[#f59e0b]/15 px-2 py-0.5 text-[11px] font-semibold text-[#fbbf24]">
                        Pending Trade
                      </span>
                    ) : null}
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
                      onList={(price, isPriority) => listCardOnMarketplace(card.card_id, price, isPriority)}
                      onUnlist={() => unlistCardFromMarketplace(card.card_id)}
                      onListSuccess={() => setListSuccessOpen(true)}
                    />
                    {showDelete ? (
                      <button
                        type="button"
                        onClick={() => setDeleteModalCard(card)}
                        className="mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-rose-400/90 transition hover:bg-rose-500/10 hover:text-rose-300"
                        aria-label={`Delete ${card.player_name}`}
                      >
                        <TrashIcon />
                        Delete
                      </button>
                    ) : null}
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
        creditBalance={Number(user?.credit_balance ?? 0)}
        animationCost={10}
        onClose={() => setAnimateModalCard(null)}
        onConfirm={(motionId) => startAnimateUpgrade(animateModalCard, motionId)}
      />

      <DeleteCardModal
        card={deleteModalCard}
        open={Boolean(deleteModalCard)}
        busy={Boolean(deleteBusyId)}
        onClose={() => setDeleteModalCard(null)}
        onConfirm={confirmDeleteCard}
      />

      <ListedSuccessModal
        open={listSuccessOpen}
        variant="my-collection"
        onClose={() => setListSuccessOpen(false)}
        onViewMarketplace={() => {
          setListSuccessOpen(false);
          navigate("/marketplace");
        }}
      />

      <CollectionToast message={toast.message} variant={toast.variant} />

      <AppFooter />
    </div>
  );
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 9.24A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-9.24.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.495.06l.375 6.75a.75.75 0 101.495.06l-.375-6.75zm4.34.06a.75.75 0 10-1.495-.06l-.375 6.75a.75.75 0 001.495.06l.375-6.75z"
        clipRule="evenodd"
      />
    </svg>
  );
}
