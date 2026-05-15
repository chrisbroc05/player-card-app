import React, { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import MarketplaceSubNav from "../components/MarketplaceSubNav";
import CardImage from "../components/CardImage";
import { useAuth } from "../context/AuthContext";
import { authFetch, formatApiError } from "../utils/authFetch";
import { formatMoney, offerStatusStyle, compareOfferToAsking } from "../utils/marketplace";

export default function MarketplaceMyOffersPage() {
  const { token, user, initializing, refreshNavBadges } = useAuth();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionKey, setActionKey] = useState("");

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
      setOffers(Array.isArray(data) ? data : []);
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

  async function cancelOffer(offerId) {
    if (!token) return;
    setActionKey(String(offerId));
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

  if (!initializing && !user) {
    return <Navigate to="/login" replace state={{ from: "/marketplace/my-offers" }} />;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-appBg text-slate-100">
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl px-3 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">My Offers</h1>
          <p className="mt-2 text-sm text-slate-400">Offers you have submitted on Free Agency.</p>
        </div>
        <MarketplaceSubNav />
        {error ? (
          <div className="mb-6 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>
        ) : null}
        {initializing || loading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-neonTeal" />
          </div>
        ) : offers.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-cardBg/50 px-6 py-12 text-center">
            <p className="text-lg text-slate-300">No offers yet</p>
            <p className="mt-2 text-sm text-slate-500">Browse Free Agency to make an offer on a listed card.</p>
            <Link
              to="/marketplace"
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-neonTeal px-5 text-sm font-semibold text-slate-950"
            >
              Browse listings
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {offers.map((offer) => {
              const statusClass = offerStatusStyle(offer.status);
              const compare = compareOfferToAsking(offer.offer_amount, offer.asking_price);
              const pending = (offer.status || "").toLowerCase() === "pending";
              return (
                <li key={offer.offer_id} className="rounded-2xl border border-white/10 bg-cardBg p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <Link
                      to={"/marketplace/" + encodeURIComponent(offer.card_id)}
                      className="block w-full max-w-[100px] shrink-0 overflow-hidden rounded-lg border border-white/10"
                    >
                      <CardImage
                        imageUrl={offer.image_url}
                        alt={offer.player_name}
                        className="aspect-[3/4] w-full object-cover"
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white">{offer.player_name}</p>
                      <p className="font-mono text-xs text-slate-500">{offer.card_id}</p>
                      <p className="mt-1 text-lg font-semibold text-neonTeal">{formatMoney(offer.offer_amount)}</p>
                      <p className="text-xs text-slate-500">
                        Asking {formatMoney(offer.asking_price)}
                        {compare ? " · " + compare : ""}
                      </p>
                      <span
                        className={"mt-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize " + statusClass}
                      >
                        {offer.status}
                      </span>
                    </div>
                    {pending ? (
                      <button
                        type="button"
                        disabled={actionKey === String(offer.offer_id)}
                        onClick={() => cancelOffer(offer.offer_id)}
                        className="min-h-[40px] shrink-0 rounded-lg border border-white/20 px-4 text-sm text-slate-300 disabled:opacity-50"
                      >
                        {actionKey === String(offer.offer_id) ? "Cancelling…" : "Cancel offer"}
                      </button>
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
