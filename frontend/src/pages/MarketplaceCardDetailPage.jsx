import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import CardImage from "../components/CardImage";
import CardDetailHero from "../components/CardDetailHero";
import TradeCardPicker from "../components/TradeCardPicker";
import { API_BASE_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { useNewCardCelebration } from "../context/NewCardCelebrationContext";
import { authFetch, formatApiError } from "../utils/authFetch";
import { computeRoyaltyPreview, formatMoney, listedAgeLabel, listingExpiresSubtextClass, cashOfferButtonLabel } from "../utils/marketplace";
import { motionLabel } from "../constants/animationMotions";
import { isAnimatedCard } from "../utils/animationCard";
import { isHighlightCard } from "../utils/highlightCard";
import { isCardOwner } from "../utils/cardOwnership";
import AnimatedBadge from "../components/AnimatedBadge";
import HighlightBadge from "../components/HighlightBadge";
import CardHistoryTimeline from "../components/CardHistoryTimeline";
import { vaultTierBadge, rarityDisplay } from "../utils/tierStyles";
import { CARD_IMAGE_FRAME_DETAIL } from "../utils/cardImageStyles";
import {
  MARKETPLACE_MODAL_OVERLAY_CLASS,
  MarketplaceModalCardDetails,
  MarketplaceModalCardSection,
  marketplaceModalPanelClass,
} from "../components/MarketplaceModalLayout";

export default function MarketplaceCardDetailPage() {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const { user, token, refreshNavBadges } = useAuth();
  const { showCelebration } = useNewCardCelebration();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offerMode, setOfferMode] = useState("cash");
  const [offerAmount, setOfferAmount] = useState("");
  const [tradeCardIds, setTradeCardIds] = useState([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [offerError, setOfferError] = useState("");
  const [offerSuccess, setOfferSuccess] = useState("");
  const [buyerBalance, setBuyerBalance] = useState(null);
  const [buyConfirmOpen, setBuyConfirmOpen] = useState(false);
  const [buyMessage, setBuyMessage] = useState("");
  const [offerConfirmOpen, setOfferConfirmOpen] = useState(false);
  const [offerSuccessOpen, setOfferSuccessOpen] = useState(false);
  const [submittedOfferAmount, setSubmittedOfferAmount] = useState(null);

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

  useEffect(() => {
    let cancelled = false;
    async function loadBalance() {
      if (!user || !token || !listing || listing.owner_id === user.id) {
        setBuyerBalance(null);
        return;
      }
      try {
        const { res } = await authFetch(token, "/credits/balance");
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok) {
          setBuyerBalance(Number(data.credit_balance) || 0);
        } else if (!cancelled) {
          setBuyerBalance(Number(user.credit_balance) || 0);
        }
      } catch {
        if (!cancelled) setBuyerBalance(Number(user.credit_balance) || 0);
      }
    }
    loadBalance();
    return () => {
      cancelled = true;
    };
  }, [user, token, listing]);

  const royaltyPreview = computeRoyaltyPreview(offerAmount);
  const badge = listing ? vaultTierBadge(listing.tier) : null;
  const isOwner = isCardOwner(listing, user);

  async function handleSubmitOffer(e, forcedCashAmount = null, forcedMessage = null, isBuyAtAsking = false) {
    e?.preventDefault?.();
    setOfferError("");
    setOfferSuccess("");
    if (!user || !token) {
      navigate("/login", { state: { from: `/marketplace/${cardId}` } });
      return false;
    }

    const isTrade = offerMode === "card_trade";
    let body;

    if (isTrade) {
      if (tradeCardIds.length < 1) {
        setOfferError("Select at least one card to offer in trade");
        return false;
      }
      body = {
        card_id: listing.card_id,
        offer_type: "card_trade",
        trade_card_ids: tradeCardIds,
        message: message.trim() || null,
      };
    } else {
      const n = Number(forcedCashAmount ?? offerAmount);
      if (!Number.isFinite(n) || n < 0.01) {
        setOfferError("Offer amount must be at least $0.01");
        return false;
      }
      if (buyerBalance != null && n > buyerBalance) {
        setOfferError("Insufficient credits — Add credits to your account");
        return false;
      }
      const messageText = String(forcedMessage ?? message ?? "");
      body = {
        card_id: listing.card_id,
        offer_type: "cash",
        offer_amount: n,
        message: messageText.trim() || null,
      };
    }

    setSubmitting(true);
    try {
      const { res, unauthorized } = await authFetch(token, "/marketplace/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (unauthorized) {
        navigate("/login", { state: { from: `/marketplace/${cardId}` } });
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Could not submit offer."));
      const wasInstantBuy = isBuyAtAsking;
      if (wasInstantBuy) {
        setBuyerBalance((prev) => {
          if (prev == null) return prev;
          const next = Number(prev) - Number(forcedCashAmount || 0);
          return Math.max(0, Math.round(next * 100) / 100);
        });
        setBuyConfirmOpen(false);
        await showCelebration({
          card: listing,
          source: "purchased",
          counterparty: listing?.owner_display_name,
          amount: Number(forcedCashAmount || 0),
        });
      } else if (isTrade) {
        setOfferSuccess("Trade offer submitted! The seller will be notified by email.");
      } else {
        setSubmittedOfferAmount(n);
        setOfferConfirmOpen(false);
        setOfferSuccessOpen(true);
      }
      setOfferAmount("");
      setTradeCardIds([]);
      setMessage("");
      setBuyMessage("");
      refreshNavBadges?.();
      if (!wasInstantBuy) {
        await load();
      }
      return true;
    } catch (err) {
      setOfferError(err.message || "Offer failed.");
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmBuyAtAsking() {
    if (!listing) return;
    const ok = await handleSubmitOffer(null, Number(listing.asking_price), buyMessage, true);
    if (!ok) {
      setBuyConfirmOpen(true);
    }
  }

  function handleRequestCashOfferConfirm(e) {
    e?.preventDefault?.();
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
    setOfferConfirmOpen(true);
  }

  async function handleConfirmCashOffer() {
    const ok = await handleSubmitOffer(null, Number(offerAmount), message);
    if (!ok) {
      setOfferConfirmOpen(true);
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-appBg text-slate-100">
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl px-6 py-8">
        <Link to="/marketplace" className="text-sm text-neonTeal hover:text-teal-200">
          &larr; Back to Free Agency Marketplace
        </Link>

        {loading ? (
          <div className="mt-12 flex justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-neonTeal" />
          </div>
        ) : error ? (
          <div className="mt-8 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-6 text-sm text-rose-100">{error}</div>
        ) : listing ? (
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <CardDetailHero className={badge?.glow || ""}>
              <CardImage
                card={listing}
                alt={listing.player_name}
                frameClassName={CARD_IMAGE_FRAME_DETAIL}
                variant="detail"
                forcePlay={isHighlightCard(listing) || (isOwner && isAnimatedCard(listing))}
                protectMedia={!isOwner && isAnimatedCard(listing)}
                useOwnerVideoProxy={isOwner && isAnimatedCard(listing)}
                token={token || ""}
              />
            </CardDetailHero>
            <div className="space-y-4">
              <div>
              <p className="font-mono text-sm text-neonTeal/90">{listing.card_id}</p>
              {listing.animation_motion ? (
                <p className="mt-2 text-sm text-slate-500">Motion: {motionLabel(listing.animation_motion)}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-slate-300">
                  {rarityDisplay(listing.rarity)}
                </span>
                {isAnimatedCard(listing) ? <AnimatedBadge /> : null}
                {isHighlightCard(listing) ? <HighlightBadge /> : null}
              </div>
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
              {(listing.pending_offer_count || 0) > 0 ? (
                <p className="mt-2 text-xs text-amber-200">{listing.pending_offer_count} pending offer(s)</p>
              ) : null}
            </div>
              <CardHistoryTimeline cardId={listing.card_id} />

              <OfferPanel
                isOwner={isOwner}
                user={user}
                token={token}
                listing={listing}
                offerMode={offerMode}
                setOfferMode={setOfferMode}
                offerAmount={offerAmount}
                setOfferAmount={setOfferAmount}
                tradeCardIds={tradeCardIds}
                setTradeCardIds={setTradeCardIds}
                message={message}
                setMessage={setMessage}
                royaltyPreview={royaltyPreview}
                offerError={offerError}
                offerSuccess={offerSuccess}
                submitting={submitting}
                buyerBalance={buyerBalance}
                onSubmit={handleSubmitOffer}
                onRequestCashOfferConfirm={handleRequestCashOfferConfirm}
                onBuyAtAsking={() => {
                  setOfferError("");
                  setOfferSuccess("");
                  setBuyConfirmOpen(true);
                }}
                onLogin={() => navigate("/login", { state: { from: `/marketplace/${cardId}` } })}
              />
            </div>
          </div>
        ) : null}
      </main>

      <BuyAtAskingConfirmModal
        open={buyConfirmOpen}
        listing={listing}
        buyerBalance={buyerBalance}
        message={buyMessage}
        setMessage={setBuyMessage}
        submitting={submitting}
        onCancel={() => setBuyConfirmOpen(false)}
        onConfirm={handleConfirmBuyAtAsking}
      />


      <CashOfferConfirmModal
        open={offerConfirmOpen}
        listing={listing}
        offerAmount={Number(offerAmount || 0)}
        buyerBalance={buyerBalance}
        submitting={submitting}
        onCancel={() => setOfferConfirmOpen(false)}
        onConfirm={handleConfirmCashOffer}
      />

      <CashOfferSuccessModal
        open={offerSuccessOpen}
        offerAmount={submittedOfferAmount}
        onBackToMarketplace={() => {
          setOfferSuccessOpen(false);
          setSubmittedOfferAmount(null);
          navigate("/marketplace");
        }}
        onViewMyOffers={() => {
          setOfferSuccessOpen(false);
          setSubmittedOfferAmount(null);
          navigate("/marketplace/my-offers");
        }}
      />
      <AppFooter />
    </div>
  );
}

function OfferPanel({
  isOwner,
  user,
  token,
  listing,
  offerMode,
  setOfferMode,
  offerAmount,
  setOfferAmount,
  tradeCardIds,
  setTradeCardIds,
  message,
  setMessage,
  royaltyPreview,
  offerError,
  offerSuccess,
  submitting,
  buyerBalance,
  onSubmit,
  onRequestCashOfferConfirm,
  onBuyAtAsking,
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

  const isTrade = offerMode === "card_trade";
  const canSubmitTrade = tradeCardIds.length >= 1;
  const askingPrice = Number(listing?.asking_price || 0);
  const insufficientAtAsking = !isTrade && buyerBalance != null && buyerBalance < askingPrice;
  const cashButtonLabel = cashOfferButtonLabel(offerAmount, askingPrice);

  function handleFormSubmit(e) {
    e.preventDefault();
    if (isTrade) {
      onSubmit(e);
    } else {
      onRequestCashOfferConfirm(e);
    }
  }

  return (
    <form onSubmit={handleFormSubmit} className="rounded-xl border border-teal-500/25 bg-teal-500/5 p-4 space-y-3">
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
          {buyerBalance != null ? (
            <p className="rounded-lg border border-white/10 bg-cardBg2 px-3 py-2 text-sm text-slate-300">
              Your balance: <span className="font-semibold text-neonTeal">{formatMoney(buyerBalance)}</span>
            </p>
          ) : null}

          <div className="flex rounded-lg border border-white/15 bg-cardBg p-0.5">
            <button
              type="button"
              onClick={() => setOfferMode("cash")}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                !isTrade ? "bg-teal-500/25 text-neonTeal" : "text-slate-400 hover:text-white"
              }`}
            >
              Cash Offer
            </button>
            <button
              type="button"
              onClick={() => setOfferMode("card_trade")}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                isTrade ? "bg-teal-500/25 text-neonTeal" : "text-slate-400 hover:text-white"
              }`}
            >
              Card Trade
            </button>
          </div>

          {isTrade ? (
            <TradeCardPicker
              token={token}
              selectedIds={tradeCardIds}
              onSelectedIdsChange={setTradeCardIds}
              excludeCardIds={[listing.card_id]}
            />
          ) : (
            <div>
              <button
                type="button"
                disabled={submitting || insufficientAtAsking}
                onClick={onBuyAtAsking}
                className="mb-3 min-h-[44px] w-full rounded-xl border border-teal-500/40 bg-teal-500/10 px-4 text-sm font-semibold text-neonTeal disabled:opacity-50"
              >
                Buy at Asking Price ({formatMoney(listing.asking_price)})
              </button>
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
              {insufficientAtAsking ? (
                <p className="mt-2 text-xs text-amber-200">
                  Insufficient credits — Add credits to your account{" "}
                  <Link to="/credits" className="text-neonTeal underline">
                    here
                  </Link>
                </p>
              ) : null}
              {!isTrade &&
              buyerBalance != null &&
              Number(offerAmount || 0) > buyerBalance ? (
                <p className="mt-2 text-xs text-amber-200">
                  Insufficient credits — Add credits to your account{" "}
                  <Link to="/credits" className="text-neonTeal underline">
                    here
                  </Link>
                </p>
              ) : null}
            </div>
          )}

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
            disabled={
              submitting ||
              (isTrade && !canSubmitTrade) ||
              (!isTrade && buyerBalance != null && Number(offerAmount || 0) > buyerBalance)
            }
            className="min-h-[48px] w-full rounded-xl bg-neonTeal font-semibold text-slate-950 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : isTrade ? "Submit Trade Offer" : cashButtonLabel}
          </button>
        </>
      )}
      {offerError ? <p className="text-sm text-rose-300">{offerError}</p> : null}
      {offerSuccess ? <p className="text-sm text-emerald-300">{offerSuccess}</p> : null}
    </form>
  );
}

function CashOfferConfirmModal({
  open,
  listing,
  offerAmount,
  buyerBalance,
  submitting,
  onCancel,
  onConfirm,
}) {
  if (!open || !listing) return null;

  const askingPrice = Number(listing.asking_price || 0);
  const amount = Number(offerAmount || 0);
  const balance = Number(buyerBalance ?? 0);
  const hasBalance = buyerBalance != null;
  const insufficient = hasBalance && amount > balance;
  const shortfall = Math.max(0, amount - balance);
  const belowAsking = amount < askingPrice - 0.005;
  const difference = Math.max(0, askingPrice - amount);

  return (
    <div className={`${MARKETPLACE_MODAL_OVERLAY_CLASS} z-[70]`}>
      <div
        className={marketplaceModalPanelClass()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="offer-confirm-title"
      >
        <h3 id="offer-confirm-title" className="text-xl font-semibold text-white">
          Confirm Offer
        </h3>

        <div className="mt-6 rounded-xl border border-white/10 bg-cardBg2 p-4">
          <MarketplaceModalCardSection card={listing}>
            <MarketplaceModalCardDetails
              listing={listing}
              extra={
                <>
                  <p className="text-[13px] leading-relaxed text-slate-200">
                    You are offering{" "}
                    <span className="font-semibold text-neonTeal">{formatMoney(amount)}</span> for this card
                  </p>
                  {belowAsking ? (
                    <p className="text-[13px] text-slate-400">
                      The seller is asking {formatMoney(askingPrice)}. Your offer is{" "}
                      <span className="font-medium text-amber-200">{formatMoney(difference)}</span> below asking
                      price.
                    </p>
                  ) : null}
                  <p className="text-[13px] text-slate-400">
                    Your balance:{" "}
                    <span className="font-semibold text-white">
                      {hasBalance ? formatMoney(balance) : "—"}
                    </span>
                  </p>
                </>
              }
            />
          </MarketplaceModalCardSection>
        </div>

        {insufficient ? (
          <div className="mt-4 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-3 text-sm text-amber-100">
            <p>
              You need <span className="font-semibold">{formatMoney(shortfall)}</span> more to submit this offer.
            </p>
            <Link
              to="/credits"
              className="mt-3 inline-flex min-h-[42px] w-full items-center justify-center rounded-lg bg-neonTeal px-4 text-sm font-semibold text-slate-950"
            >
              Add Credits
            </Link>
          </div>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            disabled={submitting}
            onClick={onCancel}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-white/20 px-4 text-sm text-slate-300 disabled:opacity-50"
          >
            Cancel
          </button>
          {!insufficient ? (
            <button
              type="button"
              disabled={submitting}
              onClick={onConfirm}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-neonTeal px-4 text-sm font-semibold text-slate-950 disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit Offer"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CashOfferSuccessModal({
  open,
  offerAmount,
  onBackToMarketplace,
  onViewMyOffers,
}) {
  if (!open || offerAmount == null) return null;

  return (
    <div className={`${MARKETPLACE_MODAL_OVERLAY_CLASS} z-[71]`}>
      <div
        className={marketplaceModalPanelClass("border-emerald-500/30")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="offer-success-title"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/50 bg-emerald-500/15 text-2xl text-emerald-300">
          ✓
        </div>
        <h3 id="offer-success-title" className="mt-4 text-center text-2xl font-semibold text-white">
          Offer Submitted!
        </h3>
        <p className="mt-3 text-center text-sm leading-relaxed text-slate-300">
          Your offer of <span className="font-semibold text-neonTeal">{formatMoney(offerAmount)}</span> has been sent
          to the seller.
        </p>
        <p className="mt-2 text-center text-sm text-slate-400">You&apos;ll be notified when they respond.</p>

        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={onViewMyOffers}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-neonTeal px-4 text-sm font-semibold text-slate-950"
          >
            View My Offers
          </button>
          <button
            type="button"
            onClick={onBackToMarketplace}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-white/20 bg-cardBg2 px-4 text-sm font-medium text-slate-100"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    </div>
  );
}

function BuyAtAskingConfirmModal({
  open,
  listing,
  buyerBalance,
  message,
  setMessage,
  submitting,
  onCancel,
  onConfirm,
}) {
  if (!open || !listing) return null;

  const askingPrice = Number(listing.asking_price || 0);
  const balance = Number(buyerBalance ?? 0);
  const hasBalance = buyerBalance != null;
  const shortfall = Math.max(0, askingPrice - balance);
  const insufficient = hasBalance && shortfall > 0;
  const balanceAfter = hasBalance ? Math.max(0, balance - askingPrice) : null;

  return (
    <div className={`${MARKETPLACE_MODAL_OVERLAY_CLASS} z-[70]`}>
      <div
        className={marketplaceModalPanelClass()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="buy-confirm-title"
      >
        <h3 id="buy-confirm-title" className="text-xl font-semibold text-white">
          Confirm Purchase
        </h3>
        <p className="mt-2 text-[13px] text-slate-400">Review purchase details before completing payment.</p>

        <div className="mt-6 rounded-xl border border-white/10 bg-cardBg2 p-4">
          <MarketplaceModalCardSection card={listing}>
            <MarketplaceModalCardDetails
              listing={listing}
              extra={
                <>
                  <p className="text-[13px] text-slate-400">
                    Seller:{" "}
                    <span className="font-medium text-white break-words">
                      {listing.owner_display_name || "Unknown Seller"}
                    </span>
                  </p>
                  <p className="text-[13px] leading-relaxed text-slate-200">
                    You are buying this card for{" "}
                    <span className="font-semibold text-neonTeal">{formatMoney(askingPrice)}</span>
                  </p>
                  <p className="text-[13px] text-slate-400">
                    Your balance:{" "}
                    <span className="font-semibold text-white">
                      {hasBalance ? formatMoney(balance) : "—"}
                    </span>
                  </p>
                  <p className="text-[13px] text-slate-400">
                    Balance after:{" "}
                    <span className="font-semibold text-white">
                      {balanceAfter != null ? formatMoney(balanceAfter) : "—"}
                    </span>
                  </p>
                </>
              }
            />
          </MarketplaceModalCardSection>
        </div>

        <div className="mt-4">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Add a message to the seller (optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Great card! Looking forward to adding it to my collection."
            className="mt-1 w-full rounded-lg border border-white/15 bg-cardBg2 px-3 py-2 text-sm text-slate-100"
          />
        </div>

        {insufficient ? (
          <div className="mt-4 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-3 text-sm text-amber-100">
            <p>
              You need <span className="font-semibold">{formatMoney(shortfall)}</span> more to complete this purchase.
            </p>
            <Link
              to="/credits"
              className="mt-3 inline-flex min-h-[42px] w-full items-center justify-center rounded-lg bg-neonTeal px-4 text-sm font-semibold text-slate-950"
            >
              Add Credits
            </Link>
          </div>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            disabled={submitting}
            onClick={onCancel}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-white/20 px-4 text-sm text-slate-300 disabled:opacity-50"
          >
            Cancel
          </button>
          {!insufficient ? (
            <button
              type="button"
              disabled={submitting}
              onClick={onConfirm}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-neonTeal px-4 text-sm font-semibold text-slate-950 disabled:opacity-50"
            >
              {submitting ? "Purchasing…" : "Confirm Purchase"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
