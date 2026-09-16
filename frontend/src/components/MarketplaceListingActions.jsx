import React, { useEffect, useMemo, useState } from "react";
import ListingModal from "./ListingModal";
import PriorityBadge, { isPriorityListing } from "./PriorityBadge";
import { toApiUrl } from "../config/api";
import { getCardBannerStyles } from "../utils/cardBannerStyles";
import { formatMoney, PLATFORM_ROYALTY_RATE } from "../utils/marketplace";
import { rarityDisplay } from "../utils/tierStyles";

export default function MarketplaceListingActions({
  card,
  listingInfo,
  busy,
  onList,
  onUnlist,
  onListSuccess,
  onOpenBulkList,
  copiesAvailable = 1,
  className = "",
  showContainerDivider = true,
  listButtonLabel = "List on Marketplace",
  listedActionLabel,
  listedTagLabel,
}) {
  const [open, setOpen] = useState(false);
  const [listSuccessOpen, setListSuccessOpen] = useState(false);
  const [unlistError, setUnlistError] = useState("");

  const isListed = Boolean(listingInfo);
  const isPendingTrade = (card?.status || "active") === "pending_trade";
  const isActive = (card?.status || "active") === "active";
  const availableCopies = Math.max(0, Number(copiesAvailable) || 0);
  const useBulkFlow = availableCopies > 1 && typeof onOpenBulkList === "function";

  if (isPendingTrade || !isActive) return null;

  async function handleUnlist() {
    setUnlistError("");
    try {
      await onUnlist();
    } catch (err) {
      setUnlistError(err.message || "Could not remove listing.");
    }
  }

  return (
    <div className={`${showContainerDivider ? "mt-2 space-y-2 border-t border-white/10 pt-2" : "space-y-2"} ${className}`}>
      {isListed ? (
        <>
          {listedTagLabel !== null ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border bg-gold-subtle px-2 py-0.5 text-[11px] font-semibold text-brand-gold">
                {listedTagLabel || `Listed on Free Agency Marketplace · ${formatMoney(listingInfo.asking_price)}`}
              </span>
              {isPriorityListing(listingInfo) ? <PriorityBadge /> : null}
            </div>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={handleUnlist}
            className="inline-flex min-h-[40px] w-full items-center justify-center rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-rose-400/40 hover:bg-rose-500/10 disabled:opacity-50"
          >
            {busy
              ? "Updating…"
              : listedActionLabel || `Listed at ${formatMoney(listingInfo.asking_price)} — Unlist`}
          </button>
          {unlistError ? <p className="text-xs text-rose-300">{unlistError}</p> : null}
        </>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (useBulkFlow) {
              onOpenBulkList(card);
              return;
            }
            setOpen(true);
          }}
          className="inline-flex min-h-[40px] w-full items-center justify-center rounded-lg border bg-gold-subtle px-3 py-2 text-sm font-medium text-brand-gold transition hover:border-[var(--color-border-gold)] disabled:opacity-50"
        >
          {listButtonLabel}
        </button>
      )}

      <SingleCardListingModal
        open={open}
        card={card}
        busy={busy}
        onClose={() => setOpen(false)}
        onList={onList}
        onListSuccess={() => {
          setOpen(false);
          if (onListSuccess) {
            onListSuccess();
          } else {
            setListSuccessOpen(true);
          }
        }}
      />

      {!onListSuccess ? (
        <ListedSuccessModal open={listSuccessOpen} onClose={() => setListSuccessOpen(false)} />
      ) : null}
    </div>
  );
}

function SingleCardListingModal({ open, card, busy, onClose, onList, onListSuccess }) {
  const [price, setPrice] = useState("");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!open) return;
    setPrice("");
    setLocalError("");
  }, [open]);

  const priceNum = Number(price);
  const priceValid = Number.isFinite(priceNum) && priceNum >= 1;

  const netEarnings = useMemo(() => {
    if (!priceValid) return 0;
    const fee = Math.round(priceNum * PLATFORM_ROYALTY_RATE * 100) / 100;
    return Math.round((priceNum - fee) * 100) / 100;
  }, [priceNum, priceValid]);

  const tierLabel = useMemo(() => {
    const banner = getCardBannerStyles(card?.tier, card?.theme || card?.special_theme);
    const rarityLabel = card?.rarity_display_name || rarityDisplay(card?.rarity);
    const rarityNorm = String(rarityLabel || "").trim().toLowerCase();
    if (rarityNorm && rarityNorm !== "base" && rarityNorm !== "standard" && rarityNorm !== "common") {
      return rarityLabel;
    }
    return banner.tierPillLabel;
  }, [card]);

  function handleClose() {
    setPrice("");
    setLocalError("");
    onClose?.();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError("");
    if (!priceValid) {
      setLocalError("Asking price must be at least $1.00");
      return;
    }
    try {
      await onList(priceNum, false);
      setPrice("");
      onListSuccess?.();
    } catch (err) {
      setLocalError(err.message || "Could not list card.");
    }
  }

  if (!card) return null;

  return (
    <ListingModal
      isOpen={open}
      onClose={handleClose}
      ariaLabelledby="single-list-player-name"
      debugLabel="single-list"
    >
      <form className="listing-modal-body single-list-modal" onSubmit={handleSubmit}>
        <button type="button" className="bulk-list-sheet__close" onClick={handleClose} aria-label="Close">
          ×
        </button>

        <div className="single-list-modal__preview">
          {card.image_url ? (
            <img
              src={toApiUrl(card.image_url)}
              alt={card.player_name || "Card"}
              className="single-list-modal__card-image"
            />
          ) : (
            <div className="single-list-modal__card-image single-list-modal__card-placeholder" aria-hidden />
          )}
        </div>

        <p id="single-list-player-name" className="single-list-modal__name">
          {card.player_name || "Card"}
        </p>
        {tierLabel ? <p className="single-list-modal__tier">{tierLabel}</p> : null}

        <div className="single-list-modal__section">
          <label className="single-list-modal__label" htmlFor="single-list-price">
            Asking Price
          </label>
          <div className="bulk-list-sheet__price-wrap">
            <span className="bulk-list-sheet__price-prefix">$</span>
            <input
              id="single-list-price"
              type="number"
              min="1"
              step="0.01"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="bulk-list-sheet__price-input"
              placeholder="0.00"
              disabled={busy}
            />
          </div>
          {priceValid ? (
            <p className="single-list-modal__earn">You&apos;d earn {formatMoney(netEarnings)}</p>
          ) : (
            <p className="bulk-list-sheet__hint">Minimum $1.00</p>
          )}
        </div>

        {localError ? <p className="bulk-list-sheet__error">{localError}</p> : null}

        <button
          type="submit"
          disabled={!priceValid || busy}
          className="bulk-list-sheet__primary-btn listing-modal-action single-list-modal__primary-btn"
        >
          {busy ? "Listing…" : "List on Marketplace"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={handleClose}
          className="bulk-list-sheet__secondary-btn listing-modal-action single-list-modal__secondary-btn"
        >
          Cancel
        </button>
      </form>
    </ListingModal>
  );
}

export function ListedSuccessModal({ open, onClose, variant = "default", onViewMarketplace }) {
  return (
    <ListingModal isOpen={open} onClose={onClose} ariaLabelledby="listed-success-title" debugLabel="listed-success">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border bg-success-subtle text-2xl text-success">
        ✓
      </div>
      <h3 id="listed-success-title" className="mt-3 text-center text-xl font-semibold text-white">
        Card Listed!
      </h3>
      <p className="mt-2 text-center text-sm text-slate-300">Your card is now live on the marketplace.</p>
      {variant === "my-collection" ? (
        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={onClose}
            className="listing-modal-action inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-white/20 bg-white/5 px-4 text-sm font-semibold text-slate-100 transition hover:border-white/30 hover:bg-white/10"
          >
            Go to My Collection
          </button>
          <button
            type="button"
            onClick={onViewMarketplace}
            className="listing-modal-action inline-flex min-h-[44px] w-full items-center justify-center rounded-lg btn-primary px-4 text-sm font-semibold text-slate-950 transition hover:opacity-90"
          >
            View on Marketplace
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onClose}
          className="listing-modal-action mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg btn-primary px-4 text-sm font-semibold text-slate-950 transition hover:opacity-90"
        >
          OK
        </button>
      )}
    </ListingModal>
  );
}
