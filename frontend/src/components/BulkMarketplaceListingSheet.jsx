import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatMoney, PLATFORM_ROYALTY_RATE } from "../utils/marketplace";
import { themeDisplayLabel } from "../utils/cardBannerStyles";

export default function BulkMarketplaceListingSheet({
  open,
  card,
  copiesOwned = 1,
  copiesAvailable = 1,
  busy = false,
  onClose,
  onConfirm,
}) {
  const maxQty = Math.max(1, Number(copiesAvailable) || 1);
  const owned = Math.max(1, Number(copiesOwned) || 1);
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successCount, setSuccessCount] = useState(null);
  const [error, setError] = useState("");

  const priceNum = Number(price);
  const priceValid = Number.isFinite(priceNum) && priceNum >= 1;

  const totals = useMemo(() => {
    if (!priceValid) {
      return { gross: 0, fee: 0, net: 0 };
    }
    const gross = quantity * priceNum;
    const fee = Math.round(gross * PLATFORM_ROYALTY_RATE * 100) / 100;
    const net = Math.round((gross - fee) * 100) / 100;
    return { gross, fee, net };
  }, [priceValid, priceNum, quantity]);

  if (!open || !card) return null;

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
      await onConfirm({ quantity, askingPrice: priceNum });
      setConfirmOpen(false);
      setSuccessCount(quantity);
    } catch (err) {
      setError(err?.message || "Could not list copies.");
      setConfirmOpen(false);
    }
  }

  const tierLabel = themeDisplayLabel(card.theme || card.special_theme);
  const playerLine = tierLabel ? `${card.player_name} (${tierLabel})` : card.player_name;

  if (successCount != null) {
    return (
      <div className="bulk-list-sheet__backdrop" role="presentation" onClick={resetAndClose}>
        <div
          className="bulk-list-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-list-success-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bulk-list-sheet__success-icon" aria-hidden>
            ✓
          </div>
          <h2 id="bulk-list-success-title" className="bulk-list-sheet__title">
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
    <div className="bulk-list-sheet__backdrop" role="presentation" onClick={resetAndClose}>
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
        <p className="bulk-list-sheet__subtext">
          You own {owned} {owned === 1 ? "copy" : "copies"} of this card
          {maxQty < owned ? ` · ${maxQty} available to list` : ""}
        </p>

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

        {!confirmOpen ? (
          <button
            type="button"
            className="bulk-list-sheet__primary-btn"
            disabled={!priceValid || busy}
            onClick={() => setConfirmOpen(true)}
          >
            List {quantity} {quantity === 1 ? "Copy" : "Copies"} for {priceValid ? formatMoney(priceNum) : "$—"} each
          </button>
        ) : (
          <div className="bulk-list-sheet__confirm">
            <p>
              List {quantity} {quantity === 1 ? "copy" : "copies"} of {playerLine} for {formatMoney(priceNum)} each?
            </p>
            <p className="bulk-list-sheet__confirm-sub">
              Total potential earnings: {formatMoney(totals.net)}
            </p>
            <div className="bulk-list-sheet__confirm-actions">
              <button
                type="button"
                className="bulk-list-sheet__primary-btn"
                disabled={busy}
                onClick={handleConfirmList}
              >
                {busy ? "Listing…" : "Confirm"}
              </button>
              <button
                type="button"
                className="bulk-list-sheet__secondary-btn"
                disabled={busy}
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
