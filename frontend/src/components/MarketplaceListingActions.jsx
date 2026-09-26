import React, { useEffect, useMemo, useState } from "react";
import ListingModal from "./ListingModal";
import MarketplaceConnectPrompt from "./MarketplaceConnectPrompt";
import MarketplaceCopyPicker from "./MarketplaceCopyPicker";
import MarketplaceCopyTile, { copyListingLabel } from "./MarketplaceCopyTile";
import MarketplaceListingModeChooser from "./MarketplaceListingModeChooser";
import PriorityBadge, { isPriorityListing } from "./PriorityBadge";
import { toApiUrl } from "../config/api";
import { getCardBannerStyles } from "../utils/cardBannerStyles";
import { formatMoney, PLATFORM_ROYALTY_RATE } from "../utils/marketplace";
import {
  fetchListableCopies,
  filterListableCopies,
  pickDefaultCopyId,
  pickDefaultMultiSelection,
} from "../utils/marketplaceCopies";
import { rarityDisplay } from "../utils/tierStyles";

export default function MarketplaceListingActions({
  card,
  listingInfo,
  busy,
  onList,
  onUnlist,
  onListSuccess,
  copyOptions = null,
  copiesAvailable = 1,
  className = "",
  showContainerDivider = true,
  listButtonLabel = "List on Marketplace",
  listedActionLabel,
  listedTagLabel,
  token = "",
  connectProfile = null,
}) {
  const [modeChooserOpen, setModeChooserOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState("single");
  const [priceOpen, setPriceOpen] = useState(false);
  const [priceMode, setPriceMode] = useState("single");
  const [listSuccessOpen, setListSuccessOpen] = useState(false);
  const [listSuccessCount, setListSuccessCount] = useState(1);
  const [unlistError, setUnlistError] = useState("");
  const [listableCopies, setListableCopies] = useState([]);
  const [selectedCopyId, setSelectedCopyId] = useState(null);
  const [selectedCopyIds, setSelectedCopyIds] = useState([]);
  const [loadingCopies, setLoadingCopies] = useState(false);
  const [copyLoadError, setCopyLoadError] = useState("");

  const isListed = Boolean(listingInfo);
  const isPendingTrade = (card?.status || "active") === "pending_trade";
  const isActive = (card?.status || "active") === "active";
  const availableCopies = Math.max(0, Number(copiesAvailable) || 0);

  const selectedCopy = useMemo(
    () => listableCopies.find((c) => c.card_id === selectedCopyId) || null,
    [listableCopies, selectedCopyId]
  );

  const selectedCopies = useMemo(
    () => listableCopies.filter((c) => selectedCopyIds.includes(c.card_id)),
    [listableCopies, selectedCopyIds]
  );

  const listingCard = selectedCopy || card;

  const printRun =
    Number(listableCopies[0]?.print_run) ||
    Number(card?.print_run) ||
    listableCopies.length ||
    1;

  useEffect(() => {
    if (!modeChooserOpen && !pickerOpen && !priceOpen) return;
    if (Array.isArray(copyOptions)) {
      setListableCopies(filterListableCopies(copyOptions));
    }
  }, [copyOptions, modeChooserOpen, pickerOpen, priceOpen]);

  if (isPendingTrade || !isActive) return null;

  function resetFlow() {
    setModeChooserOpen(false);
    setPickerOpen(false);
    setPriceOpen(false);
    setSelectedCopyId(null);
    setSelectedCopyIds([]);
    setPickerMode("single");
    setPriceMode("single");
  }

  async function resolveListableCopies() {
    if (Array.isArray(copyOptions)) {
      return filterListableCopies(copyOptions);
    }
    if (!token || !card?.card_id) {
      return filterListableCopies([card].filter(Boolean));
    }
    return fetchListableCopies(card.card_id, token);
  }

  async function handleListClick() {
    setCopyLoadError("");
    setLoadingCopies(true);
    try {
      const listable = await resolveListableCopies();
      if (listable.length === 0) {
        setCopyLoadError("No copies are available to list.");
        return;
      }

      setListableCopies(listable);

      if (listable.length === 1) {
        setSelectedCopyId(listable[0].card_id);
        setPriceMode("single");
        setPriceOpen(true);
        return;
      }

      setModeChooserOpen(true);
    } catch (err) {
      setCopyLoadError(err.message || "Could not load copies.");
    } finally {
      setLoadingCopies(false);
    }
  }

  function openSinglePicker(listable = listableCopies) {
    const defaultId = pickDefaultCopyId(listable, card?.card_id);
    setPickerMode("single");
    setSelectedCopyId(defaultId);
    setModeChooserOpen(false);
    setPickerOpen(true);
  }

  function openMultiPicker(listable = listableCopies) {
    setPickerMode("multi");
    setSelectedCopyIds(pickDefaultMultiSelection(listable, card?.card_id));
    setModeChooserOpen(false);
    setPickerOpen(true);
  }

  function handleToggleCopy(cardId) {
    setSelectedCopyIds((prev) => {
      if (prev.includes(cardId)) {
        return prev.filter((id) => id !== cardId);
      }
      return [...prev, cardId];
    });
  }

  function handlePickerContinue() {
    if (pickerMode === "multi") {
      if (selectedCopyIds.length === 0) return;
      setPriceMode("multi");
      setPickerOpen(false);
      setPriceOpen(true);
      return;
    }
    if (!selectedCopyId) return;
    setPriceMode("single");
    setPickerOpen(false);
    setPriceOpen(true);
  }

  function handlePickerBack() {
    setPickerOpen(false);
    setModeChooserOpen(true);
  }

  async function handleUnlist() {
    setUnlistError("");
    try {
      await onUnlist();
    } catch (err) {
      setUnlistError(err.message || "Could not remove listing.");
    }
  }

  function handleListSuccess(count = 1) {
    resetFlow();
    setListSuccessCount(count);
    if (onListSuccess) {
      onListSuccess(count);
    } else {
      setListSuccessOpen(true);
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
        <>
          <button
            type="button"
            disabled={busy || loadingCopies || availableCopies <= 0}
            onClick={handleListClick}
            className="inline-flex min-h-[40px] w-full items-center justify-center rounded-lg border bg-gold-subtle px-3 py-2 text-sm font-medium text-brand-gold transition hover:border-[var(--color-border-gold)] disabled:opacity-50"
          >
            {loadingCopies ? "Loading copies…" : listButtonLabel}
          </button>
          {copyLoadError ? <p className="text-xs text-rose-300">{copyLoadError}</p> : null}
        </>
      )}

      <MarketplaceListingModeChooser
        open={modeChooserOpen}
        busy={busy || loadingCopies}
        onClose={resetFlow}
        onChooseSingle={() => openSinglePicker()}
        onChooseMultiple={() => openMultiPicker()}
      />

      <MarketplaceCopyPicker
        open={pickerOpen}
        mode={pickerMode}
        copies={listableCopies}
        printRun={printRun}
        selectedCardId={selectedCopyId}
        selectedCardIds={selectedCopyIds}
        onSelect={setSelectedCopyId}
        onToggle={handleToggleCopy}
        onContinue={handlePickerContinue}
        onBack={handlePickerBack}
        onClose={resetFlow}
        busy={busy || loadingCopies}
      />

      {priceMode === "multi" ? (
        <MultiCopyListingModal
          open={priceOpen}
          copies={selectedCopies}
          printRun={printRun}
          playerName={card?.player_name}
          busy={busy}
          token={token}
          connectProfile={connectProfile}
          onClose={resetFlow}
          onList={onList}
          onListSuccess={handleListSuccess}
        />
      ) : (
        <SingleCardListingModal
          open={priceOpen}
          card={listingCard}
          busy={busy}
          token={token}
          connectProfile={connectProfile}
          onClose={resetFlow}
          onList={(askingPrice, isPriority) => onList(listingCard?.card_id, askingPrice, isPriority)}
          onListSuccess={() => handleListSuccess(1)}
        />
      )}

      {!onListSuccess ? (
        <ListedSuccessModal
          open={listSuccessOpen}
          count={listSuccessCount}
          onClose={() => setListSuccessOpen(false)}
        />
      ) : null}
    </div>
  );
}

function MultiCopyListingModal({
  open,
  copies = [],
  printRun = 1,
  playerName = "",
  busy,
  token,
  connectProfile,
  onClose,
  onList,
  onListSuccess,
}) {
  const [price, setPrice] = useState("");
  const [localError, setLocalError] = useState("");
  const [connectGateActive, setConnectGateActive] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPrice("");
    setLocalError("");
    setConnectGateActive(false);
  }, [open, copies.map((c) => c.card_id).join(",")]);

  const priceNum = Number(price);
  const priceValid = Number.isFinite(priceNum) && priceNum >= 1;
  const count = copies.length;

  const totals = useMemo(() => {
    if (!priceValid || count === 0) {
      return { gross: 0, fee: 0, net: 0 };
    }
    const gross = count * priceNum;
    const fee = Math.round(gross * PLATFORM_ROYALTY_RATE * 100) / 100;
    const net = Math.round((gross - fee) * 100) / 100;
    return { gross, fee, net };
  }, [priceValid, priceNum, count]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError("");
    if (!priceValid) {
      setLocalError("Asking price must be at least $1.00");
      return;
    }
    if (count === 0) {
      setLocalError("Select at least one copy to list.");
      return;
    }
    try {
      for (const copy of copies) {
        await onList(copy.card_id, priceNum, false);
      }
      setPrice("");
      onListSuccess?.(count);
    } catch (err) {
      setConnectGateActive(Boolean(err.connectRequired));
      setLocalError(err.message || "Could not list copies.");
    }
  }

  if (!open || count === 0) return null;

  return (
    <ListingModal
      isOpen={open}
      onClose={onClose}
      ariaLabelledby="multi-list-title"
      debugLabel="multi-copy-list"
    >
      <form className="listing-modal-body marketplace-multi-list" onSubmit={handleSubmit}>
        <button type="button" className="bulk-list-sheet__close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2 id="multi-list-title" className="bulk-list-sheet__title">
          List {count} {count === 1 ? "Copy" : "Copies"}
        </h2>
        <p className="bulk-list-sheet__subtext">
          {playerName ? `${playerName} · ` : ""}
          One price applies to each selected copy. Each gets its own marketplace listing.
        </p>

        <div className="marketplace-copy-picker__grid marketplace-multi-list__grid">
          {copies.map((copy) => (
            <div key={copy.card_id} className="marketplace-multi-list__tile-wrap">
              <MarketplaceCopyTile copy={copy} printRun={printRun} selected readOnly />
            </div>
          ))}
        </div>

        <div className="single-list-modal__section">
          <label className="single-list-modal__label" htmlFor="multi-list-price">
            Price per copy
          </label>
          <div className="bulk-list-sheet__price-wrap">
            <span className="bulk-list-sheet__price-prefix">$</span>
            <input
              id="multi-list-price"
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
            <div className="bulk-list-sheet__calc">
              <p>Total if all sell: {formatMoney(totals.gross)}</p>
              <p>Platform fee (8%): {formatMoney(totals.fee)}</p>
              <p className="bulk-list-sheet__calc-net">You receive: {formatMoney(totals.net)}</p>
            </div>
          ) : (
            <p className="bulk-list-sheet__hint">Minimum $1.00 per copy</p>
          )}
        </div>

        {localError ? <p className="bulk-list-sheet__error">{localError}</p> : null}
        {connectGateActive ? (
          <MarketplaceConnectPrompt profile={connectProfile} token={token} compact requireSellReady />
        ) : null}

        <button
          type="submit"
          disabled={!priceValid || busy || count === 0}
          className="bulk-list-sheet__primary-btn listing-modal-action"
        >
          {busy ? "Listing…" : `List ${count} ${count === 1 ? "Copy" : "Copies"} on Marketplace`}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className="bulk-list-sheet__secondary-btn listing-modal-action"
        >
          Cancel
        </button>
      </form>
    </ListingModal>
  );
}

function SingleCardListingModal({ open, card, busy, token, connectProfile, onClose, onList, onListSuccess }) {
  const [price, setPrice] = useState("");
  const [localError, setLocalError] = useState("");
  const [connectGateActive, setConnectGateActive] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPrice("");
    setLocalError("");
    setConnectGateActive(false);
  }, [open, card?.card_id]);

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

  const editionLabel = useMemo(() => {
    if (!card) return "";
    return copyListingLabel(card, card.print_run);
  }, [card]);

  const isOriginalCopy = Number(card?.edition_number) === 1;

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
      setConnectGateActive(Boolean(err.connectRequired));
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
          <div
            className={`single-list-modal__card-frame${isOriginalCopy ? " single-list-modal__card-frame--gold" : " single-list-modal__card-frame--dark"}`}
          >
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
        </div>

        <p id="single-list-player-name" className="single-list-modal__name">
          {card.player_name || "Card"}
        </p>
        {tierLabel ? <p className="single-list-modal__tier">{tierLabel}</p> : null}
        {editionLabel ? (
          <p
            className={`single-list-modal__edition${isOriginalCopy ? " single-list-modal__edition--gold" : " single-list-modal__edition--muted"}`}
          >
            {editionLabel}
          </p>
        ) : null}

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
        {connectGateActive ? (
          <div className="single-list-modal__section">
            <MarketplaceConnectPrompt
              profile={connectProfile}
              token={token}
              compact
              requireSellReady
            />
          </div>
        ) : null}

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

export function ListedSuccessModal({ open, onClose, count = 1, variant = "default", onViewMarketplace }) {
  const multi = count > 1;
  return (
    <ListingModal isOpen={open} onClose={onClose} ariaLabelledby="listed-success-title" debugLabel="listed-success">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border bg-success-subtle text-2xl text-success">
        ✓
      </div>
      <h3 id="listed-success-title" className="mt-3 text-center text-xl font-semibold text-white">
        {multi ? "Copies Listed!" : "Card Listed!"}
      </h3>
      <p className="mt-2 text-center text-sm text-slate-300">
        {multi
          ? `${count} copies are now live on the marketplace, each at your chosen price.`
          : "Your card is now live on the marketplace."}
      </p>
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
