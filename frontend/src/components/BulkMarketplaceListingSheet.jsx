import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ConfirmationCardThumbnail from "./ConfirmationCardThumbnail";
import ListingModal from "./ListingModal";
import MarketplaceConnectPrompt from "./MarketplaceConnectPrompt";
import { toApiUrl } from "../config/api";
import { formatMoney, PLATFORM_ROYALTY_RATE } from "../utils/marketplace";
import { MAX_COPIES_LISTED_AT_ONCE, parseCopyLimitError } from "../utils/copyPricing";
import { rarityDisplay } from "../utils/tierStyles";

function SelectedCardsPreview({ cards }) {
  if (!cards?.length) return null;

  const count = cards.length;
  const isSingle = count === 1;
  const showScrollFade = count > 3;

  return (
    <div className="bulk-list-selected-preview">
      <p className="bulk-list-selected-summary">
        {count} card{count === 1 ? "" : "s"} selected
      </p>
      <div
        className={`cards-scroll-container${isSingle ? " cards-scroll-container--single" : ""}${showScrollFade ? " cards-scroll-container--fade" : ""}`}
        aria-label="Selected cards"
      >
        {cards.map((card) => {
          const rarityLabel = card.rarity_display_name || rarityDisplay(card.rarity);
          const showRarity = card.rarity && card.rarity !== "standard" && rarityLabel;
          return (
            <div
              key={card.card_id}
              className={`bulk-list-selected-thumb-item${isSingle ? " bulk-list-selected-thumb-item--single" : ""}`}
            >
              <div
                className={`bulk-list-selected-thumb-frame${isSingle ? " bulk-list-selected-thumb-frame--single" : ""}`}
              >
                {card.image_url ? (
                  <img src={toApiUrl(card.image_url)} alt={card.player_name || "Card"} loading="lazy" />
                ) : (
                  <div className="bulk-list-selected-thumb-placeholder" aria-hidden />
                )}
                {showRarity ? (
                  <div className="bulk-list-selected-thumb-rarity">{rarityLabel}</div>
                ) : null}
              </div>
              <div className="bulk-list-selected-thumb-name">{card.player_name}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ListingConfirmationModal({
  open,
  quantity,
  card,
  priceNum,
  netEarnings,
  busy,
  onConfirm,
  onCancel,
}) {
  if (!open || !card) return null;

  return (
    <ListingModal
      isOpen={open}
      onClose={onCancel}
      ariaLabelledby="listing-confirm-title"
      debugLabel="listing-confirmation"
    >
      <div className="listing-confirmation-content">
        <ConfirmationCardThumbnail card={card} />
        <h2 id="listing-confirm-title" className="listing-confirmation-title">
          {quantity} {quantity === 1 ? "copy" : "copies"} of {card.player_name}
        </h2>
        <p className="listing-confirmation-line">Listed at {formatMoney(priceNum)} each</p>
        <p className="listing-confirmation-earnings">Potential earnings: {formatMoney(netEarnings)}</p>
        <button
          type="button"
          className="bulk-list-sheet__primary-btn listing-modal-action"
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? "Listing…" : "List on Marketplace"}
        </button>
        <button type="button" className="bulk-list-sheet__secondary-btn listing-modal-action" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </ListingModal>
  );
}

function ListingFormBody({
  isSelectMode,
  listableSelected,
  owned,
  copiesAvailable,
  maxQty,
  quantity,
  setQuantity,
  clampQty,
  price,
  setPrice,
  priceValid,
  totals,
  effectiveQty,
  error,
  connectGateActive,
  token,
  connectProfile,
  busy,
  onClose,
  onOpenConfirm,
}) {
  return (
    <div className="listing-modal-body">
      <button type="button" className="bulk-list-sheet__close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <h2 id="bulk-list-title" className="bulk-list-sheet__title">
        List on Marketplace
      </h2>

      {isSelectMode ? (
        <SelectedCardsPreview cards={listableSelected} />
      ) : (
        <p className="bulk-list-sheet__subtext">
          You own {owned} {owned === 1 ? "copy" : "copies"} of this card
          {maxQty < (Number(copiesAvailable) || 1)
            ? ` · list up to ${maxQty} at once`
            : maxQty < owned
              ? ` · ${maxQty} available to list`
              : ""}
        </p>
      )}

      {!isSelectMode ? (
        <div className="bulk-list-sheet__section">
          <p className="bulk-list-sheet__label">How many to list</p>
          <div className="bulk-list-sheet__qty-row">
            <button
              type="button"
              className="bulk-list-sheet__qty-btn"
              disabled={quantity <= 1 || busy}
              onClick={() => setQuantity((q) => clampQty(q - 1))}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="bulk-list-sheet__qty-value">{quantity}</span>
            <button
              type="button"
              className="bulk-list-sheet__qty-btn"
              disabled={quantity >= maxQty || busy}
              onClick={() => setQuantity((q) => clampQty(q + 1))}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          <input
            type="range"
            min={1}
            max={maxQty}
            value={quantity}
            onChange={(e) => setQuantity(clampQty(Number(e.target.value)))}
            className="bulk-list-sheet__slider"
            disabled={busy}
          />
          <div className="bulk-list-sheet__quick-row">
            {[1, 5, 10].filter((n) => n <= maxQty).map((n) => (
              <button
                key={n}
                type="button"
                className={`bulk-list-sheet__quick-btn${quantity === n ? " bulk-list-sheet__quick-btn--active" : ""}`}
                onClick={() => setQuantity(n)}
                disabled={busy}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              className={`bulk-list-sheet__quick-btn${quantity === maxQty ? " bulk-list-sheet__quick-btn--active" : ""}`}
              onClick={() => setQuantity(maxQty)}
              disabled={busy}
            >
              All ({maxQty})
            </button>
          </div>
        </div>
      ) : null}

      <div className="bulk-list-sheet__section">
        <label className="bulk-list-sheet__label" htmlFor="bulk-list-price">
          Price per card
        </label>
        <div className="bulk-list-sheet__price-wrap">
          <span className="bulk-list-sheet__price-prefix">$</span>
          <input
            id="bulk-list-price"
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
          <p className="bulk-list-sheet__hint">Minimum $1.00 per card</p>
        )}
      </div>

      {error ? <p className="bulk-list-sheet__error">{error}</p> : null}
      {connectGateActive ? (
        <MarketplaceConnectPrompt profile={connectProfile} token={token} compact requireSellReady />
      ) : null}

      <button
        type="button"
        className="bulk-list-sheet__primary-btn listing-modal-action"
        disabled={!priceValid || busy || (isSelectMode && listableSelected.length === 0)}
        onClick={onOpenConfirm}
      >
        List {effectiveQty} {effectiveQty === 1 ? "Card" : "Cards"}
        {priceValid ? ` for ${formatMoney(Number(price))} each` : ""}
      </button>
    </div>
  );
}

export default function BulkMarketplaceListingSheet({
  open,
  source = "collection",
  card,
  selectedCards = [],
  copiesOwned = 1,
  copiesAvailable = 1,
  busy = false,
  token = "",
  connectProfile = null,
  onClose,
  onConfirm,
}) {
  const isSelectMode = source === "select_mode";
  const listableSelected = useMemo(
    () => (isSelectMode ? selectedCards.filter(Boolean) : []),
    [isSelectMode, selectedCards]
  );

  const maxQty = isSelectMode
    ? Math.max(1, listableSelected.length)
    : Math.min(MAX_COPIES_LISTED_AT_ONCE, Math.max(1, Number(copiesAvailable) || 1));
  const owned = Math.max(1, Number(copiesOwned) || 1);
  const anchorCard = isSelectMode ? listableSelected[0] || card : card;

  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successCount, setSuccessCount] = useState(null);
  const [error, setError] = useState("");
  const [connectGateActive, setConnectGateActive] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuantity(isSelectMode ? Math.max(1, listableSelected.length) : 1);
    setPrice("");
    setConfirmOpen(false);
    setSuccessCount(null);
    setError("");
    setConnectGateActive(false);
  }, [open, isSelectMode, listableSelected.length]);

  const effectiveQty = isSelectMode ? listableSelected.length : quantity;
  const priceNum = Number(price);
  const priceValid = Number.isFinite(priceNum) && priceNum >= 1;

  const totals = useMemo(() => {
    if (!priceValid) {
      return { gross: 0, fee: 0, net: 0 };
    }
    const gross = effectiveQty * priceNum;
    const fee = Math.round(gross * PLATFORM_ROYALTY_RATE * 100) / 100;
    const net = Math.round((gross - fee) * 100) / 100;
    return { gross, fee, net };
  }, [priceValid, priceNum, effectiveQty]);

  if (!open || !anchorCard) return null;

  function clampQty(n) {
    return Math.min(maxQty, Math.max(1, n));
  }

  function resetAndClose() {
    setQuantity(1);
    setPrice("");
    setConfirmOpen(false);
    setSuccessCount(null);
    setError("");
    onClose?.();
  }

  async function handleConfirmList() {
    setError("");
    try {
      await onConfirm({
        quantity: effectiveQty,
        askingPrice: priceNum,
        source,
        selectedCards: listableSelected,
      });
      setConfirmOpen(false);
      setSuccessCount(effectiveQty);
    } catch (err) {
      const limit = parseCopyLimitError(err?.message || "");
      if (limit?.correctedQuantity) {
        setQuantity(Math.min(maxQty, limit.correctedQuantity));
        setError(limit.warning);
        setConnectGateActive(false);
      } else {
        setConnectGateActive(Boolean(err?.connectRequired));
        setError(err?.message || "Could not list copies.");
      }
      setConfirmOpen(false);
    }
  }

  const debugSource =
    source === "select_mode" ? "bulk-list-select-mode" : source === "detail" ? "bulk-list-detail" : "bulk-list-collection";

  if (successCount != null) {
    return (
      <ListingModal isOpen onClose={resetAndClose} ariaLabelledby="bulk-list-success-title" debugLabel="listing-success">
        <div className="listing-confirmation-content">
          <div className="bulk-list-sheet__success-icon" aria-hidden>
            ✓
          </div>
          <h2 id="bulk-list-success-title" className="listing-confirmation-title">
            {successCount} {successCount === 1 ? "copy" : "copies"} listed on marketplace!
          </h2>
          <Link to="/marketplace/my-listings" className="bulk-list-sheet__primary-btn listing-modal-action" onClick={resetAndClose}>
            View Listings
          </Link>
          <button type="button" className="bulk-list-sheet__secondary-btn listing-modal-action" onClick={resetAndClose}>
            Done
          </button>
        </div>
      </ListingModal>
    );
  }

  return (
    <>
      <ListingModal
        isOpen={open && !confirmOpen}
        onClose={resetAndClose}
        ariaLabelledby="bulk-list-title"
        debugLabel={debugSource}
      >
        <ListingFormBody
          isSelectMode={isSelectMode}
          listableSelected={listableSelected}
          owned={owned}
          copiesAvailable={copiesAvailable}
          maxQty={maxQty}
          quantity={quantity}
          setQuantity={setQuantity}
          clampQty={clampQty}
          price={price}
          setPrice={setPrice}
          priceValid={priceValid}
          totals={totals}
          effectiveQty={effectiveQty}
          error={error}
          connectGateActive={connectGateActive}
          token={token}
          connectProfile={connectProfile}
          busy={busy}
          onClose={resetAndClose}
          onOpenConfirm={() => setConfirmOpen(true)}
        />
      </ListingModal>

      <ListingConfirmationModal
        open={confirmOpen}
        quantity={effectiveQty}
        card={anchorCard}
        priceNum={priceNum}
        netEarnings={totals.net}
        busy={busy}
        onConfirm={handleConfirmList}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
