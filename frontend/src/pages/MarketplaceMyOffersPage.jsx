import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import MarketplaceSubNav from "../components/MarketplaceSubNav";
import CardImage from "../components/CardImage";
import TradeCardsThumbRow from "../components/TradeCardsThumbRow";
import { useAuth } from "../context/AuthContext";
import { useNewCardCelebration } from "../context/NewCardCelebrationContext";
import { authFetch, formatApiError } from "../utils/authFetch";
import {
  formatMoney,
  offerExpiresLabel,
  offerExpiresLineClass,
  offerStatusStyle,
  compareOfferToAsking,
  sentAgeLabel,
} from "../utils/marketplace";
import { getCardBannerStyles } from "../utils/cardBannerStyles";
import { vaultTierBadge } from "../utils/tierStyles";

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "accepted", label: "Accepted" },
  { id: "declined", label: "Declined" },
  { id: "cancelled", label: "Cancelled" },
  { id: "expired", label: "Expired" },
];

const EMPTY_BY_FILTER = {
  all: { title: "You haven't made any offers yet.", hint: "Browse Free Agency Marketplace to make an offer on a listed card." },
  pending: { title: "No pending offers.", hint: null },
  accepted: { title: "No accepted offers yet.", hint: null },
  declined: { title: "No declined offers.", hint: null },
  cancelled: { title: "No cancelled offers.", hint: null },
  expired: { title: "No expired offers.", hint: null },
};

function statusBadgeLabel(status) {
  const s = (status || "").toLowerCase();
  if (s === "expired") return "Expired";
  return status || "—";
}

function footerNote(offer) {
  const st = (offer.status || "").toLowerCase();
  const cs = offer.counter_status;
  const isTrade = (offer.offer_type || "cash") === "card_trade";
  if (st === "expired") return "Offer expired with no response";
  if (st === "accepted" && cs === "accepted") {
    return isTrade
      ? "Accepted seller's card trade counter"
      : `Accepted seller counter of ${formatMoney(offer.counter_amount)}`;
  }
  if (st === "declined" && cs === "declined") {
    return isTrade
      ? "You declined the seller's card trade counter"
      : `You declined the seller's counter of ${formatMoney(offer.counter_amount)}`;
  }
  if (st === "accepted") return isTrade ? "Card trade completed — card added to your collection" : "Card added to your collection";
  if (st === "declined") return "Offer was declined by the seller";
  if (st === "cancelled") return "You cancelled this offer";
  return null;
}

export default function MarketplaceMyOffersPage() {
  const { token, user, initializing, refreshNavBadges } = useAuth();
  const { showCelebration } = useNewCardCelebration();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionKey, setActionKey] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const { res, unauthorized } = await authFetch(token, "/marketplace/my-offers");
      if (unauthorized) {
        setError("Session expired. Please sign in again.");
        return;
      }
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error("Could not load your offers.");
      const rows = Array.isArray(data) ? data : [];
      rows.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      setOffers(rows);
    } catch (e) {
      setError(e.message || "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token || initializing) return;
    load();
  }, [token, initializing, load]);

  useEffect(() => {
    if (loading || !offers.length) return;
    let cancelled = false;
    (async () => {
      for (const offer of offers) {
        if (cancelled) return;
        if ((offer.status || "").toLowerCase() !== "accepted") continue;
        const updatedAt = offer.updated_at || offer.created_at;
        const updatedMs = updatedAt ? new Date(updatedAt).getTime() : NaN;
        if (!Number.isFinite(updatedMs) || Date.now() - updatedMs > 30 * 60 * 1000) continue;
        const isTrade = (offer.offer_type || "cash") === "card_trade";
        const shown = await showCelebration({
          card: offer,
          source: isTrade ? "traded" : "purchased",
          counterparty: offer.seller_display_name,
          amount: isTrade ? null : Number(offer.counter_amount || offer.offer_amount || 0),
        });
        if (shown) break;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, offers, showCelebration]);

  const filteredOffers = useMemo(() => {
    if (statusFilter === "all") return offers;
    return offers.filter((o) => (o.status || "").toLowerCase() === statusFilter);
  }, [offers, statusFilter]);

  async function cancelOffer(offerId) {
    if (!token) return;
    setActionKey(`cancel-${offerId}`);
    setError("");
    try {
      const path = "/marketplace/offer/" + offerId + "/cancel";
      const { res, unauthorized } = await authFetch(token, path, { method: "POST" });
      if (unauthorized) {
        setError("Session expired. Please sign in again.");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Cancel failed."));
      await load();
      refreshNavBadges?.();
    } catch (e) {
      setError(e.message || "Cancel failed.");
    } finally {
      setActionKey("");
    }
  }

  async function counterDecision(offerId, suffix) {
    if (!token) return;
    const offer = offers.find((row) => row.offer_id === offerId);
    setActionKey(`${suffix === "accept" ? "cacc" : "cdec"}-${offerId}`);
    setError("");
    try {
      const { res, unauthorized } = await authFetch(token, `/marketplace/offer/${offerId}/counter/${suffix}`, {
        method: "POST",
      });
      if (unauthorized) {
        setError("Session expired. Please sign in again.");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Action failed."));
      if (suffix === "accept" && offer) {
        const isTrade = (offer.offer_type || "cash") === "card_trade";
        await showCelebration({
          card: offer,
          source: isTrade ? "traded" : "purchased",
          counterparty: offer.seller_display_name,
          amount: isTrade ? null : Number(offer.counter_amount || offer.offer_amount || 0),
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
    return <Navigate to="/login" replace state={{ from: "/marketplace/my-offers" }} />;
  }

  const emptyCopy = EMPTY_BY_FILTER[statusFilter] || EMPTY_BY_FILTER.all;

  return (
    <div className="min-h-screen overflow-x-hidden bg-appBg text-slate-100">
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl px-3 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">My Offers</h1>
          <p className="mt-2 text-sm text-slate-400">Offers you have submitted on Free Agency Marketplace.</p>
        </div>
        <MarketplaceSubNav />

        <div className="mb-6 flex flex-wrap gap-2 border-b border-white/10 pb-3">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                statusFilter === tab.id ? "bg-teal-500/20 text-neonTeal" : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error ? (
          <div className="mb-6 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>
        ) : null}

        {initializing || loading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-neonTeal" />
          </div>
        ) : filteredOffers.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-cardBg/50 px-6 py-12 text-center">
            <p className="text-lg text-slate-300">{emptyCopy.title}</p>
            {emptyCopy.hint ? <p className="mt-2 text-sm text-slate-500">{emptyCopy.hint}</p> : null}
            {statusFilter === "all" ? (
              <Link
                to="/marketplace"
                className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-neonTeal px-5 text-sm font-semibold text-slate-950"
              >
                Browse listings
              </Link>
            ) : null}
          </div>
        ) : (
          <ul className="my-offers-list">
            {filteredOffers.map((offer) => {
              const statusClass = offerStatusStyle(offer.status);
              const isTrade = (offer.offer_type || "cash") === "card_trade";
              const offeredCards = offer.trade_cards_offered || [];
              const counterCards = offer.trade_cards_counter || [];
              const compare = !isTrade ? compareOfferToAsking(offer.offer_amount, offer.asking_price) : null;
              const statusKey = (offer.status || "").toLowerCase();
              const pending = statusKey === "pending";
              const counterPending = pending && offer.counter_status === "pending";
              const note = footerNote(offer);
              const tierBadge = vaultTierBadge(offer.tier);
              const banner = getCardBannerStyles(offer.tier, offer.theme || offer.special_theme);

              return (
                <li key={offer.offer_id} className="my-offers-card">
                  {counterPending ? (
                    <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/15 px-4 py-3">
                      {isTrade ? (
                        <>
                          <p className="text-sm font-semibold text-amber-100">Seller&apos;s Counter Offer</p>
                          <p className="mt-1 text-xs text-amber-200/90">Accept or decline to continue.</p>
                          <TradeCardsThumbRow cards={counterCards} className="mt-3" />
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-amber-100">
                            The seller countered with {formatMoney(offer.counter_amount)}
                          </p>
                          <p className="mt-1 text-xs text-amber-200/90">Accept or decline to continue.</p>
                        </>
                      )}
                      <div className="my-offers-card__actions mt-3">
                        <button
                          type="button"
                          disabled={actionKey === `cacc-${offer.offer_id}`}
                          onClick={() => counterDecision(offer.offer_id, "accept")}
                          className="my-offers-card__btn my-offers-card__btn--primary"
                        >
                          {actionKey === `cacc-${offer.offer_id}`
                            ? "Accepting…"
                            : isTrade
                              ? "Accept Counter"
                              : `Accept Counter (${formatMoney(offer.counter_amount)})`}
                        </button>
                        <button
                          type="button"
                          disabled={actionKey === `cdec-${offer.offer_id}`}
                          onClick={() => counterDecision(offer.offer_id, "decline")}
                          className="my-offers-card__btn my-offers-card__btn--secondary"
                        >
                          {actionKey === `cdec-${offer.offer_id}` ? "Declining…" : "Decline Counter"}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <Link
                    to={`/marketplace/my-offers/${offer.offer_id}`}
                    className="my-offers-card__thumb-link"
                  >
                    <CardImage card={offer} alt={offer.player_name} frameClassName="w-full" playOnHover showInfoBanner />
                  </Link>

                  <div className="my-offers-card__body">
                    <Link to={`/marketplace/my-offers/${offer.offer_id}`} className="my-offers-card__details-link">
                      <p className="my-offers-card__name">{offer.player_name}</p>
                      <div className="my-offers-card__pills">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${tierBadge.pill}`}>
                          {tierBadge.label}
                        </span>
                        {banner.themeLabel ? (
                          <span className="my-offers-card__theme">{banner.themeLabel}</span>
                        ) : null}
                      </div>
                      {isTrade ? (
                        <>
                          <p className="my-offers-card__amount my-offers-card__amount--trade">Trade offer</p>
                          <TradeCardsThumbRow cards={offeredCards} className="mt-2 justify-center" />
                        </>
                      ) : (
                        <>
                          <p className="my-offers-card__amount">Offered: {formatMoney(offer.offer_amount)}</p>
                          {offer.asking_price != null && offer.asking_price > 0 ? (
                            <p className="my-offers-card__meta">
                              Asking {formatMoney(offer.asking_price)}
                              {compare ? ` · ${compare}` : ""}
                            </p>
                          ) : null}
                        </>
                      )}
                      <span className={`my-offers-card__status ${statusClass}`}>{statusBadgeLabel(offer.status)}</span>
                      <p className="my-offers-card__sent">{sentAgeLabel(offer.created_at)}</p>
                      {pending && !counterPending && offer.days_remaining != null && offer.expires_at ? (
                        <p className={`my-offers-card__meta ${offerExpiresLineClass(offer.days_remaining)}`}>
                          {offerExpiresLabel(offer.days_remaining)}
                        </p>
                      ) : null}
                      {note ? <p className="my-offers-card__meta">{note}</p> : null}
                    </Link>

                    {pending && !counterPending ? (
                      <div className="my-offers-card__actions">
                        <button
                          type="button"
                          disabled={actionKey === `cancel-${offer.offer_id}`}
                          onClick={() => cancelOffer(offer.offer_id)}
                          className="my-offers-card__btn my-offers-card__btn--secondary"
                        >
                          {actionKey === `cancel-${offer.offer_id}` ? "Cancelling…" : "Cancel offer"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
