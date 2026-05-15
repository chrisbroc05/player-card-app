import React, { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import MarketplaceSubNav from "../components/MarketplaceSubNav";
import CardImage from "../components/CardImage";
import { useAuth } from "../context/AuthContext";
import { authFetch, formatApiError } from "../utils/authFetch";
import { formatMoney } from "../utils/marketplace";
import { vaultTierBadge } from "../utils/tierStyles";

export default function MarketplaceMyListingsPage() {
  const { token, user, initializing, refreshNavBadges } = useAuth();
  const [listings, setListings] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionKey, setActionKey] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [listRes, incRes] = await Promise.all([
        authFetch(token, "/marketplace/my-listings"),
        authFetch(token, "/marketplace/incoming-offers"),
      ]);
      if (listRes.unauthorized || incRes.unauthorized) {
        setError("Session expired. Please sign in again.");
        return;
      }
      const listData = await listRes.res.json().catch(() => []);
      const incData = await incRes.res.json().catch(() => []);
      if (!listRes.res.ok || !incRes.res.ok) {
        throw new Error("Could not load your listings.");
      }
      setListings(Array.isArray(listData) ? listData : []);
      setIncoming(Array.isArray(incData) ? incData : []);
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

  async function offerAction(offerId, action) {
    if (!token) return;
    const key = `${action}-${offerId}`;
    setActionKey(key);
    setError("");
    try {
      const { res, unauthorized } = await authFetch(token, `/marketplace/offer/${offerId}/${action}`, {
        method: "POST",
      });
      if (unauthorized) {
        setError("Session expired. Please sign in again.");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Action failed."));
      await load();
      refreshNavBadges?.();
    } catch (e) {
      setError(e.message || "Action failed.");
    } finally {
      setActionKey("");
    }
  }

  if (!initializing && !user) {
    return <Navigate to="/login" replace state={{ from: "/marketplace/my-listings" }} />;
  }

  const offersByCard = incoming.reduce((acc, o) => {
    const k = o.card_id;
    if (!acc[k]) acc[k] = [];
    acc[k].push(o);
    return acc;
  }, {});

  return (
    <div className="min-h-screen overflow-x-hidden bg-appBg text-slate-100">
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl px-3 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">My Listings</h1>
          <p className="mt-2 text-sm text-slate-400">Cards listed on Free Agency and incoming offers.</p>
        </div>
        <MarketplaceSubNav />
        {error ? (
          <div className="mb-6 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>
        ) : null}
        {initializing || loading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-neonTeal" />
          </div>
        ) : listings.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-cardBg/50 px-6 py-12 text-center">
            <p className="text-lg text-slate-300">No active listings</p>
            <p className="mt-2 text-sm text-slate-500">List a card from My Collection to start receiving offers.</p>
            <Link to="/my-collection" className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-neonTeal px-5 text-sm font-semibold text-slate-950">
              My Collection
            </Link>
          </div>
        ) : (
        <div className="space-y-6">
          {listings.map((listing) => {
            const badge = vaultTierBadge(listing.tier);
            const cardOffers = offersByCard[listing.card_id] || [];
            return (
              <article
                key={listing.card_id}
                className={`rounded-2xl border border-white/10 bg-cardBg p-4 ${badge.glow}`}
              >
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Link
                    to={`/marketplace/${encodeURIComponent(listing.card_id)}`}
                    className="block w-full max-w-[140px] shrink-0 overflow-hidden rounded-xl border border-white/10"
                  >
                    <CardImage
                      imageUrl={listing.image_url}
                      alt={listing.player_name}
                      className="aspect-[3/4] w-full object-cover"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h2 className="text-lg font-semibold text-white">{listing.player_name}</h2>
                        <p className="text-sm text-slate-400">{listing.team_name}</p>
                        <p className="mt-1 font-mono text-xs text-neonTeal/80">{listing.card_id}</p>
                      </div>
                      <p className="text-xl font-bold text-neonTeal">{formatMoney(listing.asking_price)}</p>
                    </div>
                    {(listing.pending_offer_count || 0) > 0 ? (
                      <p className="mt-2 text-sm text-amber-200">
                        {listing.pending_offer_count} pending offer
                        {listing.pending_offer_count === 1 ? "" : "s"}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">No pending offers yet</p>
                    )}
                  </div>
                </div>
                {cardOffers.length > 0 ? (
                  <ul className="mt-4 space-y-3 border-t border-white/10 pt-4">
                    {cardOffers.map((offer) => (
                      <li
                        key={offer.offer_id}
                        className="rounded-xl border border-white/10 bg-cardBg2 p-3 sm:flex sm:items-center sm:justify-between sm:gap-4"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-white">{offer.buyer_display_name}</p>
                          <p className="text-lg font-semibold text-neonTeal">{formatMoney(offer.offer_amount)}</p>
                          <p className="text-xs text-slate-500">
                            Royalty: {formatMoney(offer.royalty_amount)}
                            {offer.message ? ` · “${offer.message}”` : ""}
                          </p>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 sm:mt-0">
                          <button
                            type="button"
                            disabled={actionKey === `accept-${offer.offer_id}`}
                            onClick={() => offerAction(offer.offer_id, "accept")}
                            className="min-h-[40px] rounded-lg bg-neonTeal px-4 text-sm font-semibold text-slate-950 disabled:opacity-50"
                          >
                            {actionKey === `accept-${offer.offer_id}` ? "Accepting…" : "Accept"}
                          </button>
                          <button
                            type="button"
                            disabled={actionKey === `decline-${offer.offer_id}`}
                            onClick={() => offerAction(offer.offer_id, "decline")}
                            className="min-h-[40px] rounded-lg border border-white/20 px-4 text-sm text-slate-300 disabled:opacity-50"
                          >
                            {actionKey === `decline-${offer.offer_id}` ? "Declining…" : "Decline"}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
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
