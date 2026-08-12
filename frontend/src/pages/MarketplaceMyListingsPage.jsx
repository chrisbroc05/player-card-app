import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import MarketplaceSubNav from "../components/MarketplaceSubNav";
import CardImage from "../components/CardImage";
import TradeCardPicker from "../components/TradeCardPicker";
import TradeCardsThumbRow from "../components/TradeCardsThumbRow";
import { useAuth } from "../context/AuthContext";
import { authFetch, formatApiError } from "../utils/authFetch";
import {
  counterOfferButtonLabel,
  computeRoyaltyPreview,
  formatMoney,
  isActivePriorityListing,
  offerExpiresLabel,
  offerExpiresLineClass,
  platformRoyaltyPercentLabel,
} from "../utils/marketplace";
import { getCardBannerStyles, themeDisplayLabel } from "../utils/cardBannerStyles";
import { normalizeTierKey } from "../utils/cardTemplate";
import { formatEditionShort, vaultTierBadge } from "../utils/tierStyles";
import { CARD_IMAGE_FRAME_LISTING_ROW } from "../utils/cardImageStyles";
import {
  MarketplaceModalActions,
  MarketplaceModalCardDetails,
  MarketplaceModalCardSection,
  MarketplaceModalContent,
  MarketplaceModalShell,
  MarketplaceModalSuccessIcon,
} from "../components/MarketplaceModalLayout";

function formatLongDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

function formatListedLine(iso) {
  const date = formatLongDate(iso);
  return date ? `Listed ${date}` : "";
}

function formatExpiresLine(iso) {
  const date = formatLongDate(iso);
  return date ? `Expires ${date}` : "";
}

export default function MarketplaceMyListingsPage() {
  const navigate = useNavigate();
  const { token, user, initializing, refreshNavBadges } = useAuth();
  const [listings, setListings] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionKey, setActionKey] = useState("");
  const [relistBusyId, setRelistBusyId] = useState("");
  const [unlistBusyId, setUnlistBusyId] = useState("");
  const [counterFormOfferId, setCounterFormOfferId] = useState(null);
  const [counterAmount, setCounterAmount] = useState("");
  const [counterTradeCardIds, setCounterTradeCardIds] = useState([]);
  const [counterBusyId, setCounterBusyId] = useState(null);
  const [reviewCardId, setReviewCardId] = useState("");
  const [acceptConfirm, setAcceptConfirm] = useState(null);
  const [declineConfirm, setDeclineConfirm] = useState(null);
  const [acceptSuccess, setAcceptSuccess] = useState(null);
  const [declineNoticeOfferId, setDeclineNoticeOfferId] = useState(null);
  const [sellerBalance, setSellerBalance] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!token) return;
    if (!silent) setLoading(true);
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
      const balRes = await authFetch(token, "/credits/balance");
      if (balRes.res.ok) {
        const balData = await balRes.res.json().catch(() => ({}));
        setSellerBalance(Number(balData.credit_balance) || 0);
      }
    } catch (e) {
      setError(e.message || "Failed to load.");
    } finally {
      if (!silent) setLoading(false);
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
      await load({ silent: true });
      refreshNavBadges?.();
      return true;
    } catch (e) {
      setError(e.message || "Action failed.");
      return false;
    } finally {
      setActionKey("");
    }
  }

  async function sendCounter(offer) {
    if (!token) return;
    const isTrade = (offer.offer_type || "cash") === "card_trade";
    let body;
    if (isTrade) {
      if (counterTradeCardIds.length < 1) {
        setError("Select at least one card for your counter offer");
        return;
      }
      body = { trade_card_ids: counterTradeCardIds };
    } else {
      const n = Number(counterAmount);
      if (!Number.isFinite(n) || n < 1.0) {
        setError("Counter amount must be at least $1.00");
        return;
      }
      body = { counter_amount: n };
    }
    setCounterBusyId(offer.offer_id);
    setError("");
    try {
      const { res, unauthorized } = await authFetch(token, `/marketplace/offer/${offer.offer_id}/counter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (unauthorized) {
        setError("Session expired. Please sign in again.");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Could not send counter."));
      setCounterFormOfferId(null);
      setCounterAmount("");
      setCounterTradeCardIds([]);
      await load({ silent: true });
      refreshNavBadges?.();
    } catch (e) {
      setError(e.message || "Could not send counter.");
    } finally {
      setCounterBusyId(null);
    }
  }

  async function unlistListing(cardId) {
    if (!token) return;
    setUnlistBusyId(cardId);
    setError("");
    try {
      const { res, unauthorized } = await authFetch(token, "/marketplace/unlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_id: cardId }),
      });
      if (unauthorized) {
        setError("Session expired. Please sign in again.");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Could not remove listing."));
      await load({ silent: true });
      refreshNavBadges?.();
    } catch (e) {
      setError(e.message || "Could not remove listing.");
    } finally {
      setUnlistBusyId("");
    }
  }

  async function relist(cardId, askingPrice) {
    if (!token) return;
    setRelistBusyId(cardId);
    setError("");
    try {
      const { res, unauthorized } = await authFetch(token, "/marketplace/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_id: cardId, asking_price: askingPrice }),
      });
      if (unauthorized) {
        setError("Session expired. Please sign in again.");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Relist failed."));
      await load({ silent: true });
    } catch (e) {
      setError(e.message || "Relist failed.");
    } finally {
      setRelistBusyId("");
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

  const listingsByCard = useMemo(() => {
    const map = {};
    for (const row of listings) map[row.card_id] = row;
    return map;
  }, [listings]);

  function sortedOffersForCard(cardId) {
    const rows = [...(offersByCard[cardId] || [])];
    rows.sort((a, b) => {
      const diff = Number(b.offer_amount || 0) - Number(a.offer_amount || 0);
      if (Math.abs(diff) > 0.0001) return diff;
      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });
    return rows;
  }

  const activeReviewListing = reviewCardId ? listingsByCard[reviewCardId] || null : null;
  const activeReviewOffers = reviewCardId ? sortedOffersForCard(reviewCardId) : [];

  async function confirmAcceptOffer() {
    if (!acceptConfirm) return;
    const ok = await offerAction(acceptConfirm.offer.offer_id, "accept");
    if (!ok) return;
    const offer = acceptConfirm.offer;
    const isTrade = (offer.offer_type || "cash") === "card_trade";
    const gross = Number(offer.offer_amount || 0);
    const fee = isTrade ? 0 : computeRoyaltyPreview(gross);
    const net = isTrade ? 0 : Math.max(0, Math.round((gross - fee) * 100) / 100);
    let newBalance = sellerBalance;
    if (!isTrade && token) {
      try {
        const { res } = await authFetch(token, "/credits/balance");
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          newBalance = Number(data.credit_balance) || 0;
          setSellerBalance(newBalance);
        }
      } catch {
        /* best-effort refresh */
      }
    }
    setAcceptSuccess({
      offer,
      listing: acceptConfirm.listing,
      isTrade,
      gross,
      net,
      newBalance,
    });
    setAcceptConfirm(null);
    setReviewCardId("");
  }

  async function confirmDeclineOffer() {
    if (!declineConfirm) return;
    const ok = await offerAction(declineConfirm.offer.offer_id, "decline");
    if (!ok) return;
    setDeclineNoticeOfferId(declineConfirm.offer.offer_id);
    setDeclineConfirm(null);
    window.setTimeout(() => setDeclineNoticeOfferId(null), 2500);
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-appBg text-slate-100">
      <AppHeader />
      <main className="my-listings-page mx-auto w-full max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">My Listings</h1>
          <p className="mt-2 text-sm text-slate-400">Cards listed on Free Agency Marketplace and incoming offers.</p>
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
          <div className="my-listings-v2__empty">
            <div className="my-listings-v2__empty-icon" aria-hidden>
              🃏
            </div>
            <h2 className="my-listings-v2__empty-title">No cards listed yet</h2>
            <p className="my-listings-v2__empty-text">
              Head to My Collection to list a card on the marketplace
            </p>
            <Link to="/my-collection" className="my-listings-v2__empty-btn">
              Go to My Collection
            </Link>
          </div>
        ) : (
          <div className="my-listings-v2__list">
            {listings.map((listing) => (
              <MyListingRow
                key={listing.card_id}
                listing={listing}
                onReviewOffers={setReviewCardId}
                onRelist={relist}
                onUnlist={unlistListing}
                relistBusyId={relistBusyId}
                unlistBusyId={unlistBusyId}
              />
            ))}
          </div>
        )}
      </main>
      <OfferReviewModal
        open={Boolean(activeReviewListing)}
        listing={activeReviewListing}
        offers={activeReviewOffers}
        counterFormOfferId={counterFormOfferId}
        setCounterFormOfferId={setCounterFormOfferId}
        counterAmount={counterAmount}
        setCounterAmount={setCounterAmount}
        counterTradeCardIds={counterTradeCardIds}
        setCounterTradeCardIds={setCounterTradeCardIds}
        counterBusyId={counterBusyId}
        actionKey={actionKey}
        declineNoticeOfferId={declineNoticeOfferId}
        token={token}
        onClose={() => {
          setReviewCardId("");
          setCounterFormOfferId(null);
          setCounterAmount("");
          setCounterTradeCardIds([]);
          setDeclineNoticeOfferId(null);
        }}
        onSendCounter={sendCounter}
        onRequestAccept={(offer, listingRow) => setAcceptConfirm({ offer, listing: listingRow })}
        onRequestDecline={(offer, listingRow) => setDeclineConfirm({ offer, listing: listingRow })}
      />

      <AcceptOfferConfirmModal
        open={Boolean(acceptConfirm)}
        payload={acceptConfirm}
        actionBusy={Boolean(acceptConfirm && actionKey === `accept-${acceptConfirm.offer.offer_id}`)}
        onBack={() => setAcceptConfirm(null)}
        onConfirm={confirmAcceptOffer}
      />

      <DeclineOfferConfirmModal
        open={Boolean(declineConfirm)}
        payload={declineConfirm}
        actionBusy={Boolean(declineConfirm && actionKey === `decline-${declineConfirm.offer.offer_id}`)}
        onCancel={() => setDeclineConfirm(null)}
        onConfirm={confirmDeclineOffer}
      />

      <AcceptOfferSuccessModal
        open={Boolean(acceptSuccess)}
        payload={acceptSuccess}
        onGoProfile={() => {
          setAcceptSuccess(null);
          refreshNavBadges?.();
          navigate("/profile");
        }}
        onBackListings={() => {
          setAcceptSuccess(null);
        }}
      />
      <AppFooter />
    </div>
  );
}

function MyListingRow({ listing, onReviewOffers, onRelist, onUnlist, relistBusyId, unlistBusyId }) {
  const badge = vaultTierBadge(listing.tier);
  const tierKey = normalizeTierKey(listing.tier);
  const bannerStyles = getCardBannerStyles(listing.tier, listing.theme || listing.special_theme);
  const themeLabel = themeDisplayLabel(listing.theme || listing.special_theme);
  const offerCount = Number(listing.pending_offer_count) || 0;
  const hasOffers = offerCount > 0;
  const dr =
    listing.days_remaining != null && listing.listing_expires_at ? Number(listing.days_remaining) : null;
  const warnRelist = dr != null && dr <= 3;
  const expiryWarn = dr != null && dr <= 7;
  const isPriority = isActivePriorityListing(listing);
  const edition = formatEditionShort(listing.edition_number, listing.print_run);
  const cardDetailPath = `/marketplace/${encodeURIComponent(listing.card_id)}`;

  return (
    <article className={`my-listings-v2__item ${badge.glow}`}>
      {isPriority ? (
        <div className="my-listings-v2__priority">
          ⭐ Priority Listing — expires {formatLongDate(listing.priority_expires_at) || "soon"}
        </div>
      ) : null}

      <div className="my-listings-v2__row">
        <div className="my-listings-v2__thumb">
          <CardImage
            card={listing}
            alt={listing.player_name}
            frameClassName={CARD_IMAGE_FRAME_LISTING_ROW}
            playOnHover
          />
        </div>

        <div className="my-listings-v2__details">
          <h2 className={`my-listings-v2__name my-listings-v2__name--${tierKey}`}>
            {listing.player_name}
          </h2>

          <div className="my-listings-v2__badges">
            <span className={`my-listings-v2__tier-pill ${bannerStyles.tierPillClass}`}>
              {bannerStyles.tierPillLabel}
            </span>
            {themeLabel ? (
              <span className="my-listings-v2__theme-pill">{themeLabel}</span>
            ) : null}
          </div>

          <div className="my-listings-v2__price-block">
            <span className="my-listings-v2__price-label">Listed at</span>
            <span className="my-listings-v2__price">{formatMoney(listing.asking_price)}</span>
          </div>

          <div className="my-listings-v2__meta">
            {listing.listed_at ? (
              <p className="my-listings-v2__meta-line">{formatListedLine(listing.listed_at)}</p>
            ) : null}
            {listing.listing_expires_at ? (
              <p
                className={`my-listings-v2__meta-line ${
                  expiryWarn ? "my-listings-v2__meta-line--warn" : ""
                }`}
              >
                {formatExpiresLine(listing.listing_expires_at)}
              </p>
            ) : null}
            <p className="my-listings-v2__meta-line my-listings-v2__edition" style={{ color: badge.accent }}>
              {edition}
            </p>
          </div>

          {warnRelist ? (
            <div className="my-listings-v2__relist-warn">
              <p>Expiring soon — relist to keep it active</p>
              <button
                type="button"
                disabled={relistBusyId === listing.card_id}
                onClick={() => onRelist(listing.card_id, listing.asking_price)}
                className="my-listings-v2__btn my-listings-v2__btn--primary"
              >
                {relistBusyId === listing.card_id ? "Relisting…" : "Relist for 30 more days"}
              </button>
            </div>
          ) : null}

          <div className="my-listings-v2__offers-row">
            {hasOffers ? (
              <button
                type="button"
                onClick={() => onReviewOffers(listing.card_id)}
                className="my-listings-v2__offers-badge"
              >
                {offerCount} active offer{offerCount === 1 ? "" : "s"}
              </button>
            ) : (
              <span className="my-listings-v2__offers-none">No offers yet</span>
            )}
          </div>
        </div>

        <div className="my-listings-v2__divider" aria-hidden />

        <div className="my-listings-v2__actions">
          <button
            type="button"
            disabled={!hasOffers}
            onClick={() => hasOffers && onReviewOffers(listing.card_id)}
            className="my-listings-v2__btn my-listings-v2__btn--primary"
          >
            {hasOffers ? "Manage Offers" : "No Offers Yet"}
          </button>
          <button
            type="button"
            disabled={unlistBusyId === listing.card_id}
            onClick={() => onUnlist(listing.card_id)}
            className="my-listings-v2__btn my-listings-v2__btn--danger"
          >
            {unlistBusyId === listing.card_id ? "Unlisting…" : "Unlist Card"}
          </button>
          <Link to={cardDetailPath} className="my-listings-v2__btn my-listings-v2__btn--ghost">
            View Card
          </Link>
        </div>
      </div>
    </article>
  );
}

function OfferReviewModal({
  open,
  listing,
  offers,
  counterFormOfferId,
  setCounterFormOfferId,
  counterAmount,
  setCounterAmount,
  counterTradeCardIds,
  setCounterTradeCardIds,
  counterBusyId,
  actionKey,
  declineNoticeOfferId,
  token,
  onClose,
  onSendCounter,
  onRequestAccept,
  onRequestDecline,
}) {
  if (!open || !listing) return null;

  return (
    <div className="fixed inset-0 z-[72] flex items-center justify-center bg-black/70 px-3 py-4 sm:px-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/10 bg-cardBg p-4 shadow-2xl shadow-black/50 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">Review Offers</h2>
            <p className="mt-1 text-sm text-slate-400">Incoming offers for {listing.player_name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-white/20 px-4 text-sm text-slate-300"
          >
            Close
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-4 rounded-xl border border-white/10 bg-cardBg2 p-3 sm:flex-row sm:items-center">
          <div className="w-24 shrink-0 overflow-hidden rounded-lg border border-white/10">
            <CardImage
              card={listing}
              alt={listing.player_name}
              frameClassName="w-full"
              infoBannerVariant="compact"
              showInfoBanner
            />
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold text-white">{listing.player_name}</p>
            <p className="text-sm text-slate-400">{listing.team_name}</p>
            <p className="mt-1 font-mono text-xs text-neonTeal/80">{listing.card_id}</p>
            <p className="mt-2 text-sm text-amber-200">
              {offers.length} active offer{offers.length === 1 ? "" : "s"} (highest cash offer first)
            </p>
          </div>
        </div>

        <ul className="mt-4 space-y-3">
          {declineNoticeOfferId ? (
            <li className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-200">
              Offer declined
            </li>
          ) : null}
          {offers.map((offer) => {
            const isTrade = (offer.offer_type || "cash") === "card_trade";
            const offeredCards = offer.trade_cards_offered || [];
            const counterCards = offer.trade_cards_counter || [];
            const submittedAt = offer.created_at ? new Date(offer.created_at).toLocaleString() : "—";
            return (
              <li key={offer.offer_id} className="rounded-xl border border-white/10 bg-cardBg2 p-3 sm:p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-white">{offer.buyer_display_name}</p>
                    {isTrade ? (
                      <>
                        <p className="text-sm font-semibold text-amber-200">
                          Card Trade Offer — {offeredCards.length} card{offeredCards.length === 1 ? "" : "s"} offered
                        </p>
                        <TradeCardsThumbRow cards={offeredCards} className="mt-2" />
                      </>
                    ) : (
                      <>
                        <p className="text-lg font-semibold text-neonTeal">{formatMoney(offer.offer_amount)}</p>
                        <p className="text-xs text-slate-500">Royalty: {formatMoney(offer.royalty_amount)}</p>
                      </>
                    )}
                    {offer.message ? <p className="mt-1 text-xs text-slate-400">Message: “{offer.message}”</p> : null}
                    <p className="mt-1 text-xs text-slate-500">Submitted: {submittedAt}</p>
                    {offer.status === "pending" && offer.days_remaining != null && offer.expires_at ? (
                      <p className={`mt-2 text-xs ${offerExpiresLineClass(offer.days_remaining)}`}>
                        {offerExpiresLabel(offer.days_remaining)}
                      </p>
                    ) : null}
                  </div>
                </div>

                {offer.counter_status === "pending" ? (
                  <div className="mt-3 rounded-lg border border-teal-500/25 bg-teal-500/10 px-3 py-2 text-sm text-teal-100">
                    {isTrade ? (
                      <>
                        <p className="font-medium text-white">Counter sent — awaiting buyer response</p>
                        <TradeCardsThumbRow cards={counterCards} className="mt-2" />
                      </>
                    ) : (
                      <>
                        <p>
                          Counter sent:{" "}
                          <span className="font-semibold text-white">{formatMoney(offer.counter_amount)}</span>
                        </p>
                        <p className="mt-1 text-xs text-slate-400">Awaiting buyer response</p>
                      </>
                    )}
                  </div>
                ) : null}

                {offer.counter_status == null ? (
                  counterFormOfferId === offer.offer_id ? (
                    <div className="mt-3 space-y-2 rounded-lg border border-white/15 bg-cardBg p-3">
                      {isTrade ? (
                        <>
                          <p className="text-xs font-medium text-slate-400">
                            Select cards from your collection to send to the buyer
                          </p>
                          <TradeCardPicker
                            token={token}
                            selectedIds={counterTradeCardIds}
                            onSelectedIdsChange={setCounterTradeCardIds}
                            excludeCardIds={[listing.card_id]}
                            pickerLabel="Cards you are willing to trade to the buyer"
                          />
                        </>
                      ) : (
                        <>
                          <label className="text-xs font-medium text-slate-400">Your counter amount ($)</label>
                          <input
                            type="number"
                            min="1"
                            step="0.01"
                            value={counterAmount}
                            onChange={(e) => setCounterAmount(e.target.value)}
                            className="min-h-[40px] w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
                            placeholder="1.00"
                          />
                          <p className="text-xs text-slate-500">Buyer will see your counter and can accept or decline</p>
                        </>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={counterBusyId === offer.offer_id || (isTrade && counterTradeCardIds.length < 1)}
                          onClick={() => onSendCounter(offer)}
                          className="min-h-[40px] rounded-lg bg-neonTeal px-4 text-sm font-semibold text-slate-950 disabled:opacity-50"
                        >
                          {counterBusyId === offer.offer_id
                            ? "Sending…"
                            : counterOfferButtonLabel(counterAmount)}
                        </button>
                        <button
                          type="button"
                          disabled={counterBusyId === offer.offer_id}
                          onClick={() => {
                            setCounterFormOfferId(null);
                            setCounterAmount("");
                            setCounterTradeCardIds([]);
                          }}
                          className="min-h-[40px] rounded-lg border border-white/20 px-4 text-sm text-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={actionKey === `accept-${offer.offer_id}`}
                        onClick={() => onRequestAccept(offer, listing)}
                        className="min-h-[40px] rounded-lg bg-neonTeal px-4 text-sm font-semibold text-slate-950 disabled:opacity-50"
                      >
                        {actionKey === `accept-${offer.offer_id}` ? "Accepting…" : "Accept"}
                      </button>
                      <button
                        type="button"
                        disabled={actionKey === `decline-${offer.offer_id}`}
                        onClick={() => onRequestDecline(offer, listing)}
                        className="min-h-[40px] rounded-lg border border-white/20 px-4 text-sm text-slate-300 disabled:opacity-50"
                      >
                        {actionKey === `decline-${offer.offer_id}` ? "Declining…" : "Decline"}
                      </button>
                      <button
                        type="button"
                        disabled={actionKey.startsWith("accept-") || actionKey.startsWith("decline-")}
                        onClick={() => {
                          setCounterFormOfferId(offer.offer_id);
                          setCounterAmount("");
                          setCounterTradeCardIds([]);
                        }}
                        className="min-h-[40px] rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 text-sm font-medium text-amber-200 disabled:opacity-50"
                      >
                        Counter
                      </button>
                    </div>
                  )
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function AcceptOfferConfirmModal({ open, payload, actionBusy, onBack, onConfirm }) {
  if (!open || !payload?.offer) return null;
  const offer = payload.offer;
  const isTrade = (offer.offer_type || "cash") === "card_trade";
  const gross = Number(offer.offer_amount || 0);
  const fee = computeRoyaltyPreview(gross);
  const net = Math.max(0, Math.round((gross - fee) * 100) / 100);
  return (
    <MarketplaceModalShell
      open={open}
      zIndex={73}
      ariaLabelledBy="accept-offer-confirm-title"
      onBackdropClick={onBack}
    >
      <MarketplaceModalContent>
        <h3 id="accept-offer-confirm-title" className="text-xl font-semibold text-white">
          Accept this offer?
        </h3>
        <div className="mt-3 space-y-2 rounded-lg border border-white/10 bg-cardBg2 p-3 text-sm">
          <p className="text-slate-300">
            Buyer: <span className="font-semibold text-white">{offer.buyer_display_name}</span>
          </p>
          {isTrade ? (
            <p className="text-slate-300">
              Card <span className="font-semibold text-white">{offer.player_name || payload.listing?.player_name}</span>{" "}
              will be added to your collection.
            </p>
          ) : (
            <>
              <p className="text-slate-300">
                Amount: <span className="font-semibold text-white">{formatMoney(gross)}</span> will be added to your credit
                balance
              </p>
              <p className="text-slate-400">{platformRoyaltyPercentLabel()} platform fee ({formatMoney(fee)}) has been deducted</p>
              <p className="text-slate-300">
                Net amount you receive: <span className="font-semibold text-neonTeal">{formatMoney(net)}</span>
              </p>
            </>
          )}
        </div>
      </MarketplaceModalContent>
      <MarketplaceModalActions>
        <button
          type="button"
          disabled={actionBusy}
          onClick={onBack}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-white/20 px-4 text-sm text-slate-300"
        >
          Go Back
        </button>
        <button
          type="button"
          disabled={actionBusy}
          onClick={onConfirm}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-neonTeal px-4 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          {actionBusy ? "Accepting…" : "Yes, Accept"}
        </button>
      </MarketplaceModalActions>
    </MarketplaceModalShell>
  );
}

function DeclineOfferConfirmModal({ open, payload, actionBusy, onCancel, onConfirm }) {
  if (!open || !payload?.offer) return null;
  return (
    <MarketplaceModalShell
      open={open}
      zIndex={73}
      ariaLabelledBy="decline-offer-confirm-title"
      onBackdropClick={onCancel}
    >
      <MarketplaceModalContent>
        <h3 id="decline-offer-confirm-title" className="text-xl font-semibold text-white">
          Decline this offer?
        </h3>
        <p className="mt-3 text-sm text-slate-300">
          Are you sure you want to decline this offer from{" "}
          <span className="font-semibold text-white">{payload.offer.buyer_display_name}</span>?
        </p>
      </MarketplaceModalContent>
      <MarketplaceModalActions>
        <button
          type="button"
          disabled={actionBusy}
          onClick={onCancel}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-white/20 px-4 text-sm text-slate-300"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={actionBusy}
          onClick={onConfirm}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-rose-500/40 bg-rose-500/15 px-4 text-sm font-semibold text-rose-200 disabled:opacity-50"
        >
          {actionBusy ? "Declining…" : "Yes, Decline"}
        </button>
      </MarketplaceModalActions>
    </MarketplaceModalShell>
  );
}

function AcceptOfferSuccessModal({ open, payload, onGoProfile, onBackListings }) {
  if (!open || !payload) return null;
  const { listing, isTrade, net, newBalance } = payload;
  return (
    <MarketplaceModalShell open={open} zIndex={74} borderClass="border-emerald-500/30" ariaLabelledBy="accept-offer-success-title">
      <MarketplaceModalContent>
        <MarketplaceModalSuccessIcon />
        <h3 id="accept-offer-success-title" className="mt-4 text-center text-xl font-semibold text-white sm:text-2xl">
          Offer Accepted!
        </h3>
        <p className="mt-2 text-center text-[13px] text-slate-300">
          {isTrade ? "Card added to your collection" : `You received ${formatMoney(net)}`}
        </p>
        {newBalance != null ? (
          <p className="mt-1 text-center text-[13px] text-neonTeal">
            Current credit balance: {formatMoney(newBalance)}
          </p>
        ) : null}

        <div className="mt-4 rounded-xl border border-white/10 bg-cardBg2 p-3 sm:mt-6 sm:p-4">
          <MarketplaceModalCardSection card={listing} centered>
            <MarketplaceModalCardDetails listing={listing} />
          </MarketplaceModalCardSection>
        </div>
      </MarketplaceModalContent>

      <MarketplaceModalActions className="marketplace-modal-actions--stacked">
        <button
          type="button"
          onClick={onBackListings}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-neonTeal px-4 text-sm font-semibold text-slate-950"
        >
          Back to My Listings
        </button>
        <button
          type="button"
          onClick={onGoProfile}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-white/20 bg-cardBg2 px-4 text-sm text-slate-100"
        >
          Go to My Profile
        </button>
      </MarketplaceModalActions>
    </MarketplaceModalShell>
  );
}
