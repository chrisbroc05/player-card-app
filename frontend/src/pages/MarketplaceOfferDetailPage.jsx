import React, { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import MarketplaceSubNav from "../components/MarketplaceSubNav";
import TradeCardsThumbRow from "../components/TradeCardsThumbRow";
import {
  MarketplaceModalCardDetails,
  MarketplaceModalCardSection,
} from "../components/MarketplaceModalLayout";
import ProfileLink from "../components/ProfileLink";
import { useAuth } from "../context/AuthContext";
import { authFetch, formatApiError } from "../utils/authFetch";
import {
  formatMoney,
  offerExpiresLabel,
  offerExpiresLineClass,
} from "../utils/marketplace";

function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function statusHeadline(status) {
  const s = (status || "").toLowerCase();
  if (s === "accepted") return "Offer Accepted";
  if (s === "declined") return "Offer Declined";
  if (s === "cancelled") return "Offer Cancelled";
  if (s === "expired") return "Offer Expired";
  return "Offer Pending";
}

function statusIndicatorClass(status) {
  const s = (status || "").toLowerCase();
  if (s === "accepted") return "bg-success-subtle text-success";
  if (s === "declined") return "border-rose-500/40 bg-rose-500/15 text-rose-200";
  if (s === "cancelled") return "border-slate-500/40 bg-slate-500/15 text-slate-300";
  if (s === "expired") return "border-slate-500/40 bg-slate-500/15 text-slate-300";
  return "border-amber-500/40 bg-amber-500/15 text-amber-200";
}

export default function MarketplaceOfferDetailPage() {
  const { offerId } = useParams();
  const navigate = useNavigate();
  const { token, user, initializing, refreshNavBadges } = useAuth();
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionKey, setActionKey] = useState("");

  const load = useCallback(async () => {
    if (!token || !offerId) return;
    setLoading(true);
    setError("");
    try {
      const { res, unauthorized } = await authFetch(token, `/marketplace/offer/${offerId}`);
      if (unauthorized) {
        setError("Session expired. Please sign in again.");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(formatApiError(data?.detail, "Could not load offer."));
      }
      setOffer(data);
    } catch (e) {
      setError(e.message || "Failed to load offer.");
      setOffer(null);
    } finally {
      setLoading(false);
    }
  }, [token, offerId]);

  useEffect(() => {
    if (!token || initializing) return;
    load();
  }, [token, initializing, load]);

  async function cancelOffer() {
    if (!token || !offer?.offer_id) return;
    setActionKey("cancel");
    setError("");
    try {
      const { res, unauthorized } = await authFetch(token, `/marketplace/offer/${offer.offer_id}/cancel`, {
        method: "POST",
      });
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

  async function counterDecision(suffix) {
    if (!token || !offer?.offer_id) return;
    setActionKey(suffix);
    setError("");
    try {
      const { res, unauthorized } = await authFetch(
        token,
        `/marketplace/offer/${offer.offer_id}/counter/${suffix}`,
        { method: "POST" }
      );
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
    return <Navigate to="/login" replace state={{ from: `/marketplace/my-offers/${offerId}` }} />;
  }

  const statusKey = (offer?.status || "").toLowerCase();
  const isTrade = (offer?.offer_type || "cash") === "card_trade";
  const counterPending = statusKey === "pending" && offer?.counter_status === "pending";
  const offeredCards = offer?.trade_cards_offered || [];
  const counterCards = offer?.trade_cards_counter || [];

  return (
    <div className="min-h-screen overflow-x-hidden bg-appBg text-slate-100">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to="/marketplace/my-offers"
          className="mb-4 inline-flex text-sm text-slate-400 transition hover:text-white"
        >
          ← Back to My Offers
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">Offer Details</h1>
        </div>
        <MarketplaceSubNav />

        {error ? (
          <div className="mb-6 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {initializing || loading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-[var(--color-gold-primary)]" />
          </div>
        ) : !offer ? (
          <div className="rounded-2xl border border-white/10 bg-cardBg p-6 text-center">
            <p className="text-slate-300">Offer not found.</p>
            <Link
              to="/marketplace/my-offers"
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl btn-primary px-5 text-sm font-semibold text-slate-950"
            >
              Back to My Offers
            </Link>
          </div>
        ) : (
          <article className="rounded-2xl border border-white/10 bg-cardBg p-5 sm:p-6">
            <div className="flex items-start gap-3">
              {statusKey === "accepted" ? (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-success-subtle text-xl text-success">
                  ✓
                </div>
              ) : statusKey === "declined" ? (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-rose-400/50 bg-rose-500/15 text-xl text-rose-300">
                  ✕
                </div>
              ) : null}
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold text-white">{statusHeadline(offer.status)}</h2>
                <span
                  className={`mt-2 inline-flex rounded-full border px-2.5 py-0.5 text-[13px] font-semibold capitalize ${statusIndicatorClass(
                    offer.status
                  )}`}
                >
                  {statusKey === "pending" && !counterPending
                    ? "Pending — waiting for seller response"
                    : offer.status || "—"}
                </span>
              </div>
            </div>

            {counterPending ? (
              <div className="mt-5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-4 py-4">
                {isTrade ? (
                  <>
                    <p className="text-base font-semibold text-amber-100">Seller&apos;s Counter Offer</p>
                    <p className="mt-1 text-[13px] text-amber-200/90">Accept or decline to continue.</p>
                    <TradeCardsThumbRow cards={counterCards} className="mt-3" />
                  </>
                ) : (
                  <>
                    <p className="text-base font-semibold text-amber-100">
                      The seller countered with {formatMoney(offer.counter_amount)}
                    </p>
                    <p className="mt-1 text-[13px] text-amber-200/90">Accept or decline to continue.</p>
                  </>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={actionKey === "accept"}
                    onClick={() => counterDecision("accept")}
                    className="min-h-[44px] rounded-lg btn-primary px-4 text-sm font-semibold text-slate-950 disabled:opacity-50"
                  >
                    {actionKey === "accept"
                      ? "Accepting…"
                      : isTrade
                        ? "Accept Counter"
                        : `Accept Counter (${formatMoney(offer.counter_amount)})`}
                  </button>
                  <button
                    type="button"
                    disabled={actionKey === "decline"}
                    onClick={() => counterDecision("decline")}
                    className="min-h-[44px] rounded-lg border border-white/20 px-4 text-sm text-slate-300 disabled:opacity-50"
                  >
                    {actionKey === "decline" ? "Declining…" : "Decline Counter"}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-6 rounded-xl border border-white/10 bg-cardBg2 p-4">
              <MarketplaceModalCardSection card={offer}>
                <MarketplaceModalCardDetails
                  listing={offer}
                  extra={
                    <>
                      {statusKey === "accepted" ? (
                        <p className="text-[13px] text-slate-300">
                          Purchased from{" "}
                          <ProfileLink
                            displayName={offer.seller_display_name || offer.owner_display_name || "seller"}
                            className="profile-link profile-link--inline font-medium text-white"
                          />
                        </p>
                      ) : offer.seller_display_name || offer.owner_display_name ? (
                        <p className="text-[13px] text-slate-400">
                          Seller:{" "}
                          <ProfileLink
                            displayName={offer.seller_display_name || offer.owner_display_name}
                            className="profile-link profile-link--inline font-medium text-slate-200"
                            prefixAt={false}
                          />
                        </p>
                      ) : null}

                      {isTrade ? (
                        <div className="space-y-2 pt-1">
                          <p className="text-base font-semibold text-amber-200">Cards offered in trade</p>
                          <TradeCardsThumbRow cards={offeredCards} />
                        </div>
                      ) : (
                        <p className="text-base font-semibold text-brand-gold">
                          Offer amount: {formatMoney(offer.offer_amount)}
                        </p>
                      )}

                      {offer.asking_price != null && offer.asking_price > 0 ? (
                        <p className="text-[13px] text-slate-400">
                          Listing asking price: {formatMoney(offer.asking_price)}
                        </p>
                      ) : null}

                      <p className="text-[13px] text-slate-400">
                        Submitted: {formatDateTime(offer.created_at)}
                      </p>
                      {statusKey !== "pending" && offer.updated_at ? (
                        <p className="text-[13px] text-slate-400">
                          {statusKey === "accepted"
                            ? "Accepted"
                            : statusKey === "declined"
                              ? "Declined"
                              : statusKey === "cancelled"
                                ? "Cancelled"
                                : "Updated"}
                          : {formatDateTime(offer.updated_at)}
                        </p>
                      ) : null}
                      {statusKey === "pending" && !counterPending && offer.days_remaining != null && offer.expires_at ? (
                        <p className={`text-[13px] ${offerExpiresLineClass(offer.days_remaining)}`}>
                          {offerExpiresLabel(offer.days_remaining)}
                        </p>
                      ) : null}
                    </>
                  }
                />
              </MarketplaceModalCardSection>
            </div>

            {offer.message ? (
              <div className="mt-5 rounded-xl border border-white/10 bg-cardBg2 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Your message</p>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-200 break-words">{offer.message}</p>
              </div>
            ) : null}

            {statusKey === "accepted" ? (
              <p className="mt-5 text-[13px] text-slate-300">This card is now in your collection.</p>
            ) : null}
            {statusKey === "declined" ? (
              <p className="mt-5 text-[13px] text-slate-400">
                This listing may still be available on the marketplace.
              </p>
            ) : null}
            {statusKey === "cancelled" ? (
              <p className="mt-5 text-[13px] text-slate-400">You cancelled this offer before it was accepted.</p>
            ) : null}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              {statusKey === "accepted" ? (
                <button
                  type="button"
                  onClick={() => navigate("/my-collection")}
                  className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl btn-primary px-4 text-sm font-semibold text-slate-950"
                >
                  View in My Collection
                </button>
              ) : statusKey === "declined" ? (
                <button
                  type="button"
                  onClick={() => navigate("/marketplace")}
                  className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl btn-primary px-4 text-sm font-semibold text-slate-950"
                >
                  Back to Marketplace
                </button>
              ) : statusKey === "pending" && !counterPending ? (
                <button
                  type="button"
                  disabled={actionKey === "cancel"}
                  onClick={cancelOffer}
                  className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 text-sm font-semibold text-rose-200 disabled:opacity-50"
                >
                  {actionKey === "cancel" ? "Cancelling…" : "Cancel Offer"}
                </button>
              ) : (
                <Link
                  to="/marketplace/my-offers"
                  className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl border border-white/20 px-4 text-sm font-medium text-slate-200"
                >
                  Back to My Offers
                </Link>
              )}
            </div>
          </article>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
