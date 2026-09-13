import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CardImage from "./CardImage";
import { formatMoney, PLATFORM_ROYALTY_RATE } from "../utils/marketplace";
import { MAX_COPIES_LISTED_AT_ONCE, parseCopyLimitError } from "../utils/copyPricing";
import { themeDisplayLabel } from "../utils/cardBannerStyles";
import { cardMediaFrameClass } from "../utils/highlightCard";

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
    <div className="listing-confirmation-modal" role="presentation" onClick={onCancel}>
      <div
        className="listing-confirmation-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="listing-confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="listing-confirmation-thumb">
          <CardImage
            card={card}
            alt={card.player_name}
            cacheBust={card.created_at}
            frameClassName={`${cardMediaFrameClass(card)} w-full`}
            playOnHover={false}
          />
        </div>
        <h2 id="listing-confirm-title" className="listing-confirmation-title">
          {quantity} {quantity === 1 ? "copy" : "copies"} of {card.player_name}
        </h2>
        <p className="listing-confirmation-line">Listed at {formatMoney(priceNum)} each</p>
        <p className="listing-confirmation-earnings">Potential earnings: {formatMoney(netEarnings)}</p>
        <button type="button" className="bulk-list-sheet__primary-btn" disabled={busy} onClick={onConfirm}>
          {busy ? "Listing…" : "List on Marketplace"}
        </button>
        <button type="button" className="bulk-list-sheet__secondary-btn" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
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
    : Math.min(
        MAX_COPIES_LISTED_AT_ONCE,
        Math.max(1, Number(copiesAvailable) || 1)
      );
  const owned = Math.max(1, Number(copiesOwned) || 1);
  const anchorCard = isSelectMode ? listableSelected[0] || card : card;

  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successCount, setSuccessCount] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setQuantity(isSelectMode ? Math.max(1, listableSelected.length) : 1);
    setPrice("");
    setConfirmOpen(false);
    setSuccessCount(null);
    setError("");
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
      } else {
        setError(err?.message || "Could not list copies.");
      }
      setConfirmOpen(false);
    }
  }

  if (successCount != null) {
    return (
      <div className="listing-confirmation-modal" role="presentation" onClick={resetAndClose}>
        <div
          className="listing-confirmation-content"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-list-success-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bulk-list-sheet__success-icon" aria-hidden>
            ✓
          </div>
          <h2 id="bulk-list-success-title" className="listing-confirmation-title">
            {successCount} {successCount === 1 ? "copy" : "copies"} listed on marketplace!
          </h2>
          <Link to="/marketplace/my-listings" className="bulk-list-sheet__primary-btn" onClick={resetAndClose}>
            View Listings
          </Link>
          <button type="button" className="bulk-list-sheet__secondary-btn" onClick={resetAndClose}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bulk-list-sheet__backdrop bulk-list-sheet__backdrop--sheet" role="presentation" onClick={resetAndClose}>
        <div
          className="bulk-list-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-list-title"
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" className="bulk-list-sheet__close" onClick={resetAndClose} aria-label="Close">
            ×
          </button>
          <h2 id="bulk-list-title" className="bulk-list-sheet__title">
            List on Marketplace
          </h2>

          {isSelectMode ? (
            <>
              <p className="bulk-list-sheet__subtext">
                You have selected {listableSelected.length} card{listableSelected.length === 1 ? "" : "s"} to list
              </p>
              {listableSelected.length > 1 ? (
                <div className="bulk-list-selected-thumbs" aria-label="Selected cards">
                  {listableSelected.map((c) => (
                    <div key={c.card_id} className="bulk-list-selected-thumb">
                      <CardImage
                        card={c}
                        alt={c.player_name}
                        cacheBust={c.created_at}
                        frameClassName={`${cardMediaFrameClass(c)} w-full`}
                        playOnHover={false}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </>
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

          <button
            type="button"
            className="bulk-list-sheet__primary-btn"
            disabled={!priceValid || busy || (isSelectMode && listableSelected.length === 0)}
            onClick={() => setConfirmOpen(true)}
          >
            List {effectiveQty} {effectiveQty === 1 ? "Card" : "Cards"}
            {priceValid ? ` for ${formatMoney(priceNum)} each` : ""}
          </button>
        </div>
      </div>

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
