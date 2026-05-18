import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import CardImage from "../components/CardImage";
import { API_BASE_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { authFetch, formatApiError } from "../utils/authFetch";
import { computeRoyaltyPreview, formatMoney, listedAgeLabel, listingExpiresSubtextClass } from "../utils/marketplace";
import { motionLabel } from "../constants/animationMotions";
import { isAnimatedCard } from "../utils/animationCard";
import AnimatedBadge from "../components/AnimatedBadge";
import CardHistoryTimeline from "../components/CardHistoryTimeline";
import { vaultTierBadge, rarityDisplay, formatEditionShort } from "../utils/tierStyles";
import { CARD_IMAGE_FRAME_DETAIL } from "../utils/cardImageStyles";

export default function MarketplaceCardDetailPage() {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const { user, token, refreshNavBadges } = useAuth();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offerAmount, setOfferAmount] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [offerError, setOfferError] = useState("");
  const [offerSuccess, setOfferSuccess] = useState("");

  const load = useCallback(async () => {
    if (!cardId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/marketplace/listings/${encodeURIComponent(cardId)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Listing not found."));
      setListing(data);
    } catch (e) {
      setError(e.message || "Could not load listing.");
      setListing(null);
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    load();
  }, [load]);

  const royaltyPreview = computeRoyaltyPreview(offerAmount);
  const badge = listing ? vaultTierBadge(listing.tier) : null;
  const isOwner = user && listing && listing.owner_id === user.id;

  async function handleSubmitOffer(e) {
    e.preventDefault();
    setOfferError("");
    setOfferSuccess("");
    if (!user || !token) {
      navigate("/login", { state: { from: `/marketplace/${cardId}` } });
      return;
    }
    const n = Number(offerAmount);
    if (!Number.isFinite(n) || n < 0.01) {
      setOfferError("Offer amount must be at least $0.01");
      return;
    }
    setSubmitting(true);
    try {
      const { res, unauthorized } = await authFetch(token, "/marketplace/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: listing.card_id,
          offer_amount: n,
          message: message.trim() || null,
        }),
      });
      if (unauthorized) {
        navigate("/login", { state: { from: `/marketplace/${cardId}` } });
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Could not submit offer."));
      setOfferSuccess("Offer submitted! The seller will be notified by email.");
      setOfferAmount("");
      setMessage("");
      refreshNavBadges?.();
      await load();
    } catch (err) {
      setOfferError(err.message || "Offer failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-appBg text-slate-100">
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl px-3 py-8 sm:px-6 lg:px-8">
        <Link to="/marketplace" className="text-sm text-neonTeal hover:text-teal-200">
          &larr; Back to Free Agency
        </Link>

        {loading ? (
          <div className="mt-12 flex justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-neonTeal" />
          </div>
        ) : error ? (
          <div className="mt-8 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-6 text-sm text-rose-100">{error}</div>
        ) : listing ? (
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <div className={`rounded-2xl border border-white/10 bg-cardBg p-3 ${badge?.glow || ""}`}>
              <CardImage
                card={listing}
                alt={listing.player_name}
                frameClassName={CARD_IMAGE_FRAME_DETAIL}
                variant="detail"
                forcePlay={isAnimatedCard(listing)}
              />
            </div>
            <div className="space-y-4">
              <div>
              <p className="font-mono text-sm text-neonTeal/90">{listing.card_id}</p>
              <h1 className="mt-1 text-2xl font-semibold text-white">{listing.player_name}</h1>
              <p className="text-slate-400">{listing.team_name} · {listing.position}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge?.pill || ""}`}>{badge?.label}</span>
                <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-slate-300">{rarityDisplay(listing.rarity)}</span>
                {isAnimatedCard(listing) ? <AnimatedBadge /> : null}
              </div>
              {listing.animation_motion ? (
                <p className="text-sm text-slate-500">Motion: {motionLabel(listing.animation_motion)}</p>
              ) : null}
              <p className="mt-3 text-3xl font-bold text-neonTeal">{formatMoney(listing.asking_price)}</p>
              {listing.days_remaining != null && listing.listing_expires_at ? (
                <p className={`mt-1 text-sm ${listingExpiresSubtextClass(listing.days_remaining)}`}>
                  {listing.days_remaining <= 0
                    ? "Listing expires today"
                    : `Listing expires in ${listing.days_remaining} day${listing.days_remaining === 1 ? "" : "s"}`}
                </p>
              ) : null}
              <p className="text-sm text-slate-500">Listed by {listing.owner_display_name}</p>
              <p className="text-xs text-slate-600">{listedAgeLabel(listing.listed_at)}</p>
              <p className="text-xs text-slate-500">{formatEditionShort(listing.edition_number, listing.print_run)}</p>
              {(listing.pending_offer_count || 0) > 0 ? (
                <p className="mt-2 text-xs text-amber-200">{listing.pending_offer_count} pending offer(s)</p>
              ) : null}
            </div>
              <CardHistoryTimeline cardId={listing.card_id} />

              <OfferPanel
                isOwner={isOwner}
                user={user}
                listing={listing}
                offerAmount={offerAmount}
                setOfferAmount={setOfferAmount}
                message={message}
                setMessage={setMessage}
                royaltyPreview={royaltyPreview}
                offerError={offerError}
                offerSuccess={offerSuccess}
                submitting={submitting}
                onSubmit={handleSubmitOffer}
                onLogin={() => navigate("/login", { state: { from: `/marketplace/${cardId}` } })}
              />
            </div>
          </div>
        ) : null}
      </main>
      <AppFooter />
    </div>
  );
}

function OfferPanel({
  isOwner,
  user,
  listing,
  offerAmount,
  setOfferAmount,
  message,
  setMessage,
  royaltyPreview,
  offerError,
  offerSuccess,
  submitting,
  onSubmit,
  onLogin,
}) {
  if (isOwner) {
    return (
      <p className="rounded-xl border border-white/10 bg-cardBg2 px-4 py-3 text-sm text-slate-400">
        This is your listing. Manage offers from{" "}
        <Link to="/marketplace/my-listings" className="text-neonTeal underline">
          My Listings
        </Link>
        .
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-teal-500/25 bg-teal-500/5 p-4 space-y-3">
      <h2 className="text-lg font-semibold text-white">Make an offer</h2>
      {!user ? (
        <p className="text-sm text-slate-400">
          <button type="button" onClick={onLogin} className="font-medium text-neonTeal underline">
            Sign in
          </button>{" "}
          to submit an offer.
        </p>
      ) : (
        <>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Offer amount ($)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-lg border border-white/15 bg-cardBg px-3 py-2 text-slate-100"
            />
            <p className="mt-1 text-xs text-slate-500">Enter your offer amount</p>
            <p className="mt-1 text-xs text-slate-500">
              Platform royalty (2%): {formatMoney(royaltyPreview)} · Asking: {formatMoney(listing.asking_price)}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Message (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={2000}
              className="mt-1 w-full rounded-lg border border-white/15 bg-cardBg px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="min-h-[48px] w-full rounded-xl bg-neonTeal font-semibold text-slate-950 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit offer"}
          </button>
        </>
      )}
      {offerError ? <p className="text-sm text-rose-300">{offerError}</p> : null}
      {offerSuccess ? <p className="text-sm text-emerald-300">{offerSuccess}</p> : null}
    </form>
  );
}
