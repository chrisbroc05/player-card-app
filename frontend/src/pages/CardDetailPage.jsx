import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import { API_BASE_URL, authHeaders } from "../config/api";
import CardImage from "../components/CardImage";
import CardDetailHero from "../components/CardDetailHero";
import ShareCard from "../components/ShareCard";
import SendCard from "../components/SendCard";
import ProfileLink from "../components/ProfileLink";
import MarketplaceListingActions from "../components/MarketplaceListingActions";
import { useAuth } from "../context/AuthContext";
import CardHistoryTimeline from "../components/CardHistoryTimeline";
import { vaultTierBadge } from "../utils/tierStyles";
import { templateDisplayName } from "../utils/cardTemplate";
import { normalizeRarityKey } from "../utils/rarityStyles";
import RarityBadge from "../components/RarityBadge";
import { isAnimatedCard } from "../utils/animationCard";
import { isHighlightCard } from "../utils/highlightCard";
import { isCardOwner } from "../utils/cardOwnership";
import AnimatedBadge from "../components/AnimatedBadge";
import HighlightBadge from "../components/HighlightBadge";
import ErrorBoundary from "../components/ErrorBoundary";
import { CARD_IMAGE_FRAME_DETAIL } from "../utils/cardImageStyles";
import { authFetch, formatApiError } from "../utils/authFetch";
import { normalizeCardForDisplay, safeMotionLabel } from "../utils/cardDetailUtils";

function formatCreatedAt(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function copyRowMatchesRoute(c, routeParam) {
  if (!routeParam) return false;
  const raw = String(routeParam);
  try {
    const dec = decodeURIComponent(raw);
    return c.card_id === dec || c.card_id === raw || c.shareable_slug === dec || c.shareable_slug === raw;
  } catch {
    return c.card_id === raw || c.shareable_slug === raw;
  }
}

export default function CardDetailPage() {
  const { cardId } = useParams();
  const { user, token, refreshNavBadges } = useAuth();
  const [card, setCard] = useState(null);
  const [copies, setCopies] = useState([]);
  const [listingInfo, setListingInfo] = useState(null);
  const [marketplaceBusy, setMarketplaceBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refetchCard = useCallback(async () => {
    if (!cardId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/cards/${encodeURIComponent(cardId)}`, {
        headers: { ...authHeaders(token) },
      });
      if (res.ok) setCard(normalizeCardForDisplay(await res.json()));
      const res2 = await fetch(`${API_BASE_URL}/cards/${encodeURIComponent(cardId)}/copies`);
      if (res2.ok) {
        const data = await res2.json();
        setCopies(Array.isArray(data) ? data : []);
      }
    } catch {
      /* ignore */
    }
  }, [cardId, token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cardId) return;
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE_URL}/cards/${encodeURIComponent(cardId)}`, {
          headers: { ...authHeaders(token) },
        });
        if (res.status === 404) {
          setError("Card not found.");
          setCard(null);
          return;
        }
        if (!res.ok) throw new Error("Could not load card.");
        const data = await res.json();
        if (!cancelled) setCard(normalizeCardForDisplay(data));
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cardId, token]);

  useEffect(() => {
    if (!cardId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/cards/${encodeURIComponent(cardId)}/copies`);
        if (!res.ok) {
          if (!cancelled) setCopies([]);
          return;
        }
        const data = await res.json();
        if (!cancelled) setCopies(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setCopies([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  const badge = card ? vaultTierBadge(card?.tier ?? "rookie") : null;
  const isOwner = isCardOwner(card, user);
  const showSendTrade = isOwner && (card?.status || "active") === "active";
  const showPendingTradePanel = isOwner && card?.status === "pending_trade";
  const displayCard = useMemo(
    () => (card ? normalizeCardForDisplay(card) : null),
    [card]
  );
  const cardCaptureRef = useRef(null);

  const loadListingStatus = useCallback(async () => {
    if (!token || !card?.card_id || !isOwner) {
      setListingInfo(null);
      return;
    }
    try {
      const { res, unauthorized } = await authFetch(token, "/marketplace/my-listings");
      if (unauthorized || !res.ok) {
        setListingInfo(null);
        return;
      }
      const listings = await res.json().catch(() => []);
      const row = Array.isArray(listings) ? listings.find((x) => x?.card_id === card.card_id) || null : null;
      setListingInfo(row);
    } catch {
      setListingInfo(null);
    }
  }, [token, card?.card_id, isOwner]);

  useEffect(() => {
    loadListingStatus();
  }, [loadListingStatus]);

  async function listCardOnMarketplace(askingPrice, isPriority = false) {
    if (!token || !card?.card_id) return;
    setMarketplaceBusy(true);
    setError("");
    try {
      const { res, unauthorized } = await authFetch(token, "/marketplace/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: card.card_id,
          asking_price: askingPrice,
          is_priority: Boolean(isPriority),
        }),
      });
      if (unauthorized) throw new Error("Session expired.");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Could not list card."));
      setListingInfo((prev) => ({
        ...(prev || {}),
        card_id: card.card_id,
        asking_price: askingPrice,
        is_priority: Boolean(isPriority),
      }));
      refreshNavBadges?.();
      await Promise.all([refetchCard(), loadListingStatus()]);
    } catch (e) {
      setError(e.message || "Could not list card.");
      throw e;
    } finally {
      setMarketplaceBusy(false);
    }
  }

  async function unlistCardFromMarketplace() {
    if (!token || !card?.card_id) return;
    setMarketplaceBusy(true);
    setError("");
    try {
      const { res, unauthorized } = await authFetch(token, "/marketplace/unlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_id: card.card_id }),
      });
      if (unauthorized) throw new Error("Session expired.");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Could not remove listing."));
      setListingInfo(null);
      refreshNavBadges?.();
      await refetchCard();
    } catch (e) {
      setError(e.message || "Could not remove listing.");
      throw e;
    } finally {
      setMarketplaceBusy(false);
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-appBg text-slate-100">
      <AppHeader />

      <main className="mx-auto w-full max-w-4xl px-6 py-8">
        <Link
          to={user ? "/my-collection" : "/"}
          className="mb-6 inline-flex items-center text-sm text-slate-400 transition hover:text-white"
        >
          {user ? "← Back to My Collection" : "← Back to Studio"}
        </Link>

        {loading ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/15 border-t-[var(--color-gold-primary)]" />
          </div>
        ) : error || !card ? (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-8 text-center text-rose-100">
            {error || "Card not found."}
          </div>
        ) : (
          <ErrorBoundary cardId={displayCard?.card_id || cardId} backTo={user ? "/my-collection" : "/"}>
            <div className="animate-fadeUp">
              <CardDetailHero className={badge?.glow ?? ""}>
                <CardImage
                  card={displayCard}
                  alt={displayCard?.player_name || "Card"}
                  cacheBust={displayCard?.created_at}
                  frameClassName={CARD_IMAGE_FRAME_DETAIL}
                  variant="detail"
                  forcePlay={
                    isHighlightCard(displayCard) || isAnimatedCard(displayCard)
                  }
                  protectMedia={!isOwner && isAnimatedCard(displayCard)}
                  token={token || ""}
                  captureRef={cardCaptureRef}
                />
              </CardDetailHero>

              <div className="mx-auto mt-10 max-w-xl space-y-6 text-center sm:text-left">
                {displayCard?.animation_motion ? (
                  <p className="text-sm text-slate-400">
                    Motion:{" "}
                    <span className="text-violet-200">
                      {safeMotionLabel(displayCard.animation_motion)}
                    </span>
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <RarityBadge rarity={displayCard?.rarity} size="detail" />
                  <span className="text-sm font-medium text-slate-300">
                    {templateDisplayName(
                      displayCard?.tier,
                      displayCard?.rarity_template,
                      displayCard?.template_name
                    )}
                  </span>
                  {isAnimatedCard(displayCard) ? <AnimatedBadge /> : null}
                  {isHighlightCard(displayCard) ? <HighlightBadge /> : null}
                </div>

                {normalizeRarityKey(displayCard?.rarity) === "one_of_one" ? (
                  <p className="text-sm font-medium text-rose-300">
                    1 of 1 — This card is unique and can never be duplicated
                  </p>
                ) : null}

                {!isOwner && displayCard?.owner_name ? (
                  <p className="text-sm text-slate-400">
                    Owned by <ProfileLink displayName={displayCard.owner_name} className="profile-link" />
                  </p>
                ) : null}

                <dl className="grid gap-3 rounded-2xl border border-white/10 bg-cardBg p-4 text-sm sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <dt className="text-slate-500">Card ID</dt>
                    <dd className="font-mono text-xs text-brand-gold">{displayCard?.card_id}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-slate-500">Created</dt>
                    <dd className="text-slate-200">{formatCreatedAt(displayCard?.created_at)}</dd>
                  </div>
                </dl>

                <CardHistoryTimeline cardId={displayCard?.card_id} />

                {copies.length > 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-cardBg p-4 sm:p-5">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Print Run
                    </h2>
                    <p className="mt-2 text-sm text-slate-200">
                      This is card #{displayCard?.edition_number ?? 1} of{" "}
                      {displayCard?.print_run ?? 1}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {copies.map((c) => {
                        const isCurrent =
                          copyRowMatchesRoute(c, cardId) || c.card_id === displayCard?.card_id;
                        const slug = c.shareable_slug || c.card_id;
                        return (
                          <Link
                            key={c.card_id}
                            to={`/card/${encodeURIComponent(slug)}`}
                            className={`inline-flex min-h-[32px] min-w-[2rem] items-center justify-center rounded-md border px-2 text-xs font-semibold transition ${
                              isCurrent
                                ? "border-[#ffd700] bg-[#ffd70022] text-[#ffd700]"
                                : "border-[#2a2a2a] bg-[#1a1a1a] text-[#888888] hover:border-white/25 hover:text-slate-200"
                            }`}
                          >
                            {c.edition_number}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <ShareCard card={displayCard} sectionTitle="Share This Card" isOwner={isOwner} captureRef={cardCaptureRef} />

                {isOwner && displayCard?.face_photo_url ? (
                  <p className="mt-3 text-center text-xs text-slate-500 sm:text-left">
                    Face reference used for AI likeness on this card.
                  </p>
                ) : null}

                {showSendTrade ? <SendCard card={displayCard} onSent={refetchCard} /> : null}
                {showPendingTradePanel ? (
                  <SendCard card={displayCard} onCancelTrade={refetchCard} />
                ) : null}
                {isOwner && user ? (
                  <section className="rounded-2xl border border-white/10 bg-cardBg p-4 sm:p-5">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Marketplace
                    </h2>
                    <p className="mt-2 text-sm text-slate-300">
                      List this card for sale or remove it from the marketplace.
                    </p>
                    <MarketplaceListingActions
                      card={displayCard}
                      listingInfo={listingInfo}
                      busy={marketplaceBusy}
                      onList={listCardOnMarketplace}
                      onUnlist={unlistCardFromMarketplace}
                      showContainerDivider={false}
                      className="mt-3"
                      listButtonLabel="List on Marketplace"
                      listedActionLabel={
                        listingInfo
                          ? `Listed at $${Number(listingInfo.asking_price || 0).toFixed(2)} — Unlist`
                          : undefined
                      }
                      listedTagLabel={null}
                    />
                  </section>
                ) : null}

                <div className="flex justify-center sm:justify-start">
                  <Link
                    to={user ? "/my-collection" : "/"}
                    className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/20 bg-cardBg2 px-6 py-2.5 text-sm font-medium text-slate-100 transition hover:border-[var(--color-border-gold)] hover:text-white"
                  >
                    {user ? "Back to My Collection" : "Back to Studio"}
                  </Link>
                </div>
              </div>
            </div>
          </ErrorBoundary>
        )}
      </main>

      <AppFooter />
    </div>
  );
}
