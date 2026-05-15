import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import MarketplaceSubNav from "../components/MarketplaceSubNav";
import CardImage from "../components/CardImage";
import { useAuth } from "../context/AuthContext";
import { authFetch, formatApiError } from "../utils/authFetch";
import { formatMoney, offerStatusStyle, compareOfferToAsking } from "../utils/marketplace";
import { CARD_IMAGE_FRAME_XS } from "../utils/cardImageStyles";

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "accepted", label: "Accepted" },
  { id: "declined", label: "Declined" },
  { id: "cancelled", label: "Cancelled" },
];

const EMPTY_BY_FILTER = {
  all: { title: "You haven't made any offers yet.", hint: "Browse Free Agency to make an offer on a listed card." },
  pending: { title: "No pending offers.", hint: null },
  accepted: { title: "No accepted offers yet.", hint: null },
  declined: { title: "No declined offers.", hint: null },
  cancelled: { title: "No cancelled offers.", hint: null },
};

const STATUS_NOTE = {
  accepted: "Card added to your collection",
  declined: "Offer was declined by the seller",
  cancelled: "You cancelled this offer",
};

export default function MarketplaceMyOffersPage() {
  const { token, user, initializing, refreshNavBadges } = useAuth();
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

  const filteredOffers = useMemo(() => {
    if (statusFilter === "all") return offers;
    return offers.filter((o) => (o.status || "").toLowerCase() === statusFilter);
  }, [offers, statusFilter]);

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

  const emptyCopy = EMPTY_BY_FILTER[statusFilter] || EMPTY_BY_FILTER.all;

  return (
    <div className="min-h-screen overflow-x-hidden bg-appBg text-slate-100">
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl px-3 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">My Offers</h1>
          <p className="mt-2 text-sm text-slate-400">Offers you have submitted on Free Agency.</p>
        </div>
        <MarketplaceSubNav />

        <div className="mb-6 flex flex-wrap gap-2 border-b border-white/10 pb-3">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                statusFilter === tab.id
                  ? "bg-teal-500/20 text-neonTeal"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
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
          <ul className="space-y-4">
            {filteredOffers.map((offer) => {
              const statusClass = offerStatusStyle(offer.status);
              const compare = compareOfferToAsking(offer.offer_amount, offer.asking_price);
              const statusKey = (offer.status || "").toLowerCase();
              const pending = statusKey === "pending";
              const note = STATUS_NOTE[statusKey];

              return (
                <li key={offer.offer_id} className="rounded-2xl border border-white/10 bg-cardBg p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <Link
                      to={"/marketplace/" + encodeURIComponent(offer.card_id)}
                      className="block w-full max-w-[100px] shrink-0"
                    >
                      <CardImage
                        imageUrl={offer.image_url}
                        alt={offer.player_name}
                        frameClassName={CARD_IMAGE_FRAME_XS}
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
                        className={
                          "mt-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize " +
                          statusClass
                        }
                      >
                        {offer.status}
                      </span>
                      {note ? <p className="mt-1 text-xs text-slate-500">{note}</p> : null}
                    </div>
                    {pending ? (
                      <button
                        type="button"
                        disabled={actionKey === String(offer.offer_id)}
                        onClick={() => cancelOffer(offer.offer_id)}
                        className="min-h-[40px] shrink-0 self-start rounded-lg border border-white/20 px-4 text-sm text-slate-300 disabled:opacity-50"
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
