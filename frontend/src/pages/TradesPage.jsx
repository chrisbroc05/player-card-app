import React, { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import CardImage from "../components/CardImage";
import TradeCardsThumbRow from "../components/TradeCardsThumbRow";
import { cardMediaFrameClass, cardPlaysVideoOnHover } from "../utils/highlightCard";
import { API_BASE_URL, authHeaders } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { useNewCardCelebration } from "../context/NewCardCelebrationContext";
import { vaultTierBadge, formatEditionShort, rarityDisplay } from "../utils/tierStyles";
import { formatMoney, offerExpiresLabel, offerExpiresLineClass } from "../utils/marketplace";
import { CARD_ASPECT } from "../utils/cardImageStyles";
import { ActivityHistorySection } from "../components/ActivityHistory";
import ProfileLink from "../components/ProfileLink";

function relativeSentLabel(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 48) return `${h} hour${h === 1 ? "" : "s"} ago`;
    const days = Math.floor(h / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  } catch {
    return "";
  }
}

function tierImageGlow(tier) {
  const t = (tier || "").toLowerCase();
  if (t === "legends") return "shadow-[0_0_28px_rgba(255,215,0,0.35)] border-amber-400/50";
  if (t === "allstar") return "shadow-[0_0_26px_rgba(26,106,181,0.4)] border-[#1A6AB5]/50";
  return "shadow-[0_0_26px_rgba(255,69,0,0.35)] border-orange-500/50";
}

function isMarketplaceCardTrade(offer) {
  return (offer?.offer_type || "cash") === "card_trade";
}

const MARKETPLACE_OFFER_CARD_FRAME = `relative w-full ${CARD_ASPECT}`;

/** Listed card for thumbnail — never use buyer trade_cards_offered here. */
function listingCardFromOffer(offer) {
  const listing = offer?.listing_card;
  if (listing && typeof listing === "object") {
    return {
      ...listing,
      card_id: listing.card_id || offer.card_id,
    };
  }
  return {
    card_id: offer.card_id,
    player_name: offer.player_name,
    image_url: offer.image_url,
    tier: offer.tier,
    theme: offer.theme,
    special_theme: offer.special_theme,
    rarity: offer.rarity,
    is_animated: offer.is_animated,
    is_highlight: offer.is_highlight,
    animation_status: offer.animation_status,
    highlight_status: offer.highlight_status,
    animated_video_url: offer.animated_video_url,
    highlight_video_url: offer.highlight_video_url,
    created_at: offer.listing_created_at || offer.created_at,
  };
}

function MarketplaceOfferInboxRow({ offer }) {
  const isTrade = isMarketplaceCardTrade(offer);
  const offeredCards = offer.trade_cards_offered || [];
  const counterCards = offer.trade_cards_counter || [];
  const awaitingBuyer = offer.counter_status === "pending";
  const listingCard = listingCardFromOffer(offer);

  return (
    <li className="rounded-2xl border border-white/10 bg-cardBg p-5 shadow-lg sm:p-6">
      <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-10">
        <div className="mx-auto flex w-full max-w-[12rem] shrink-0 flex-col items-center pt-0.5 md:mx-0">
          <div className="w-full rounded-xl border-2 border-white/15 bg-black/35 p-2.5 shadow-inner">
            <CardImage
              card={listingCard}
              alt={listingCard.player_name || offer.player_name}
              cacheBust={listingCard.created_at}
              frameClassName={MARKETPLACE_OFFER_CARD_FRAME}
              playOnHover={cardPlaysVideoOnHover(listingCard)}
              infoBannerVariant="compact"
            />
          </div>
          <p className="mt-3 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Your listing
          </p>
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-center space-y-3.5 text-center md:items-start md:text-left md:space-y-4">
          <div className="w-full space-y-1">
            <p className="text-lg font-semibold text-white">{offer.player_name}</p>
            <p className="font-mono text-xs text-brand-gold/85">{offer.card_id}</p>
          </div>
          <p className="text-sm text-slate-300">
            From{" "}
            <ProfileLink
              displayName={offer.buyer_display_name}
              className="profile-link profile-link--inline font-medium text-amber-100/95"
              prefixAt={false}
            />
          </p>
          {isTrade ? (
            <div className="w-full max-w-lg space-y-3 pt-1">
              <p className="text-sm font-semibold text-amber-200">
                Card trade — {offeredCards.length} card{offeredCards.length === 1 ? "" : "s"} offered
              </p>
              <TradeCardsThumbRow cards={offeredCards} variant="inbox" />
            </div>
          ) : (
            <p className="text-lg font-semibold text-brand-gold">Cash offer {formatMoney(offer.offer_amount)}</p>
          )}
          {offer.message ? (
            <p className="w-full max-w-md rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-left text-sm text-slate-200">
              {offer.message}
            </p>
          ) : null}
          {offer.days_remaining != null && offer.expires_at ? (
            <p className={`text-xs ${offerExpiresLineClass(offer.days_remaining)}`}>
              {offerExpiresLabel(offer.days_remaining)}
            </p>
          ) : null}
          {awaitingBuyer ? (
            <div className="w-full max-w-md rounded-lg border bg-gold-subtle px-3 py-2 text-left text-sm text-brand-gold">
              You countered — waiting for the buyer to respond
              {isTrade && counterCards.length > 0 ? (
                <TradeCardsThumbRow cards={counterCards} variant="inbox" className="mt-3" />
              ) : null}
            </div>
          ) : null}
          <p className="text-xs text-slate-500">{relativeSentLabel(offer.created_at)}</p>
          <div className="flex w-full max-w-xs justify-center pt-1 md:max-w-none md:justify-start">
            <Link
              to="/marketplace/my-listings"
              state={{ reviewCardId: offer.card_id }}
              className="inline-flex min-h-[42px] w-full items-center justify-center rounded-xl btn-primary px-5 py-2 text-sm font-semibold text-slate-950 md:w-auto"
            >
              Review &amp; respond
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}

function compareMarketplaceIncoming(a, b) {
  const aTrade = isMarketplaceCardTrade(a);
  const bTrade = isMarketplaceCardTrade(b);
  if (aTrade !== bTrade) return aTrade ? -1 : 1;
  if (!aTrade && !bTrade) {
    const diff = Number(b.offer_amount || 0) - Number(a.offer_amount || 0);
    if (Math.abs(diff) > 0.0001) return diff;
  }
  return String(b.created_at || "").localeCompare(String(a.created_at || ""));
}

export default function TradesPage() {
  const { token, user, initializing, refreshNavBadges } = useAuth();
  const { showCelebration } = useNewCardCelebration();
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [marketplaceIncoming, setMarketplaceIncoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionKey, setActionKey] = useState("");
  const [activityItems, setActivityItems] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState("");
  const [activityFilter, setActivityFilter] = useState("all");

  const loadActivity = useCallback(async () => {
    if (!token) return;
    setActivityLoading(true);
    setActivityError("");
    try {
      const res = await fetch(`${API_BASE_URL}/activity/history?limit=200`, {
        headers: { ...authHeaders(token) },
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data?.detail === "string" ? data.detail : "Could not load activity.");
      setActivityItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setActivityError(e.message || "Could not load activity.");
      setActivityItems([]);
    } finally {
      setActivityLoading(false);
    }
  }, [token]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [incRes, outRes, mpRes] = await Promise.all([
        fetch(`${API_BASE_URL}/trades/incoming`, { headers: { ...authHeaders(token) } }),
        fetch(`${API_BASE_URL}/trades/outgoing`, { headers: { ...authHeaders(token) } }),
        fetch(`${API_BASE_URL}/marketplace/incoming-offers`, { headers: { ...authHeaders(token) } }),
      ]);
      if (!incRes.ok || !outRes.ok || !mpRes.ok) throw new Error("Could not load trades.");
      const inc = await incRes.json();
      const out = await outRes.json();
      const mp = await mpRes.json();
      setIncoming(Array.isArray(inc) ? inc : []);
      setOutgoing(Array.isArray(out) ? out : []);
      const mpRows = Array.isArray(mp) ? [...mp] : [];
      mpRows.sort(compareMarketplaceIncoming);
      setMarketplaceIncoming(mpRows);
    } catch (e) {
      setError(e.message || "Failed to load.");
    } finally {
      setLoading(false);
    }
    await loadActivity();
    refreshNavBadges?.();
  }, [token, loadActivity, refreshNavBadges]);

  useEffect(() => {
    if (!token || initializing) return;
    load();
  }, [token, initializing, load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    const targetId =
      hash === "#activity-history"
        ? "activity-history"
        : hash === "#marketplace-offers"
          ? "marketplace-offers"
          : null;
    if (!targetId) return;
    const el = document.getElementById(targetId);
    if (el) {
      window.requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  }, [loading, activityLoading, marketplaceIncoming.length]);

  async function postTradeAction(tradeId, path) {
    if (!token) return;
    const incomingOffer = incoming.find((row) => row.id === tradeId);
    const key = `${path}-${tradeId}`;
    setActionKey(key);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/trades/${tradeId}/${path}`, {
        method: "POST",
        headers: { ...authHeaders(token) },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data?.detail === "string" ? data.detail : "Request failed.");
      if (path === "accept" && incomingOffer) {
        await showCelebration({
          card: data?.card_id ? data : incomingOffer.card,
          source: "traded",
          counterparty: incomingOffer.sender?.display_name,
        });
      }
      await load();
      refreshNavBadges?.();
    } catch (e) {
      setError(e.message || "Action failed.");
    } finally {
      setActionKey("");
    }
  }

  if (!initializing && !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-appBg text-slate-100">
      <AppHeader />

      <main className="mx-auto w-full max-w-5xl px-3 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Offers &amp; Trades</h1>
          <p className="mt-2 text-sm text-slate-400">
            Marketplace offers on your listings, direct card sends from other players, and cards you&apos;ve offered
            to others.
          </p>
        </div>

        {error ? (
          <div className="mb-6 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>
        ) : null}

        {initializing || loading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-[var(--color-gold-primary)]" />
          </div>
        ) : (
          <div className="space-y-12">
            <section id="marketplace-offers" className="scroll-mt-28 pt-1">
              <h2 className="mb-4 border-b border-white/10 pb-2 text-lg font-semibold text-white">
                Marketplace offers on your listings
              </h2>
              {marketplaceIncoming.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/15 bg-cardBg/40 px-4 py-10 text-center text-sm text-slate-500">
                  No pending marketplace offers
                </p>
              ) : (
                <ul className="space-y-5">
                  {marketplaceIncoming.map((offer) => (
                    <MarketplaceOfferInboxRow key={`mp-${offer.offer_id}`} offer={offer} />
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="mb-4 border-b border-white/10 pb-2 text-lg font-semibold text-white">
                Direct card sends to you
              </h2>
              {incoming.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/15 bg-cardBg/40 px-4 py-10 text-center text-sm text-slate-500">
                  No incoming direct trade offers
                </p>
              ) : (
                <ul className="space-y-5">
                  {incoming.map((offer) => {
                    const c = offer.card || {};
                    const badge = vaultTierBadge(c.tier);
                    const rowBusy =
                      actionKey === `accept-${offer.id}` || actionKey === `decline-${offer.id}`;
                    return (
                      <li
                        key={offer.id}
                        className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-cardBg p-4 shadow-lg sm:flex-row sm:items-stretch"
                      >
                        <div
                          className={`mx-auto w-40 shrink-0 overflow-hidden rounded-xl border-2 bg-black/30 sm:mx-0 sm:w-44 ${tierImageGlow(c.tier)}`}
                        >
                          <CardImage
                            card={c}
                            alt={c.player_name}
                            cacheBust={c.created_at}
                            frameClassName={cardMediaFrameClass(c)}
                            playOnHover={cardPlaysVideoOnHover(c)}
                          />
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <p className="text-lg font-semibold text-white">{c.player_name}</p>
                          <div className="flex flex-wrap gap-2">
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.pill}`}>
                              {badge.label}
                            </span>
                            <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-slate-300">
                              {rarityDisplay(c.rarity)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{formatEditionShort(c.edition_number, c.print_run)}</p>
                          <p className="text-sm text-slate-300">
                            From <ProfileLink displayName={offer.sender?.display_name} className="profile-link profile-link--inline font-medium text-amber-100/95" prefixAt={false} />
                          </p>
                          {offer.message ? (
                            <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200">
                              {offer.message}
                            </p>
                          ) : null}
                          <p className="text-xs text-slate-500">{relativeSentLabel(offer.created_at)}</p>
                          <div className="flex flex-wrap gap-2 pt-2">
                            <button
                              type="button"
                              disabled={rowBusy}
                              onClick={() => postTradeAction(offer.id, "accept")}
                              className="inline-flex min-h-[42px] flex-1 items-center justify-center rounded-xl btn-primary px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(34,197,94,0.35)] transition hover:brightness-110 disabled:opacity-50 sm:flex-none"
                            >
                              {actionKey === `accept-${offer.id}` ? "…" : "Accept"}
                            </button>
                            <button
                              type="button"
                              disabled={rowBusy}
                              onClick={() => postTradeAction(offer.id, "decline")}
                              className="inline-flex min-h-[42px] flex-1 items-center justify-center rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-200/95 transition hover:border-rose-400/50 hover:bg-rose-500/15 disabled:opacity-50 sm:flex-none"
                            >
                              {actionKey === `decline-${offer.id}` ? "…" : "Decline"}
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section>
              <h2 className="mb-4 border-b border-white/10 pb-2 text-lg font-semibold text-white">Cards You&apos;re Sending</h2>
              {outgoing.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/15 bg-cardBg/40 px-4 py-10 text-center text-sm text-slate-500">
                  No outgoing trade offers
                </p>
              ) : (
                <ul className="space-y-5">
                  {outgoing.map((offer) => {
                    const c = offer.card || {};
                    const badge = vaultTierBadge(c.tier);
                    const rowBusy = actionKey === `cancel-${offer.id}`;
                    return (
                      <li
                        key={offer.id}
                        className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-cardBg p-4 shadow-lg sm:flex-row sm:items-stretch"
                      >
                        <div
                          className={`mx-auto w-40 shrink-0 overflow-hidden rounded-xl border-2 bg-black/30 sm:mx-0 sm:w-44 ${tierImageGlow(c.tier)}`}
                        >
                          <CardImage
                            card={c}
                            alt={c.player_name}
                            cacheBust={c.created_at}
                            frameClassName={cardMediaFrameClass(c)}
                            playOnHover={cardPlaysVideoOnHover(c)}
                          />
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <p className="text-lg font-semibold text-white">{c.player_name}</p>
                          <div className="flex flex-wrap gap-2">
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.pill}`}>
                              {badge.label}
                            </span>
                            <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-slate-300">
                              {rarityDisplay(c.rarity)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{formatEditionShort(c.edition_number, c.print_run)}</p>
                          <p className="text-sm text-slate-300">
                            To <ProfileLink displayName={offer.recipient?.display_name} className="profile-link profile-link--inline font-medium text-brand-gold/90" prefixAt={false} />
                          </p>
                          {offer.message ? (
                            <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-400">
                              Your message: {offer.message}
                            </p>
                          ) : null}
                          <p className="text-xs text-slate-500">{relativeSentLabel(offer.created_at)}</p>
                          <div className="pt-2">
                            <button
                              type="button"
                              disabled={rowBusy}
                              onClick={() => postTradeAction(offer.id, "cancel")}
                              className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/35 hover:bg-white/10 disabled:opacity-50"
                            >
                              {actionKey === `cancel-${offer.id}` ? "…" : "Cancel Trade"}
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <div id="activity-history">
              <ActivityHistorySection
                items={activityItems}
                loading={activityLoading}
                error={activityError}
                filter={activityFilter}
                onFilterChange={setActivityFilter}
              />
            </div>
          </div>
        )}

        <div className="mt-10">
          <Link to="/my-collection" className="text-sm text-slate-400 transition hover:text-white">
            ← Back to My Collection
          </Link>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
