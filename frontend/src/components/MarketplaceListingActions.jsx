import React, { useMemo, useState } from "react";
import PriorityBadge, { isPriorityListing } from "./PriorityBadge";
import { formatMoney, PRIORITY_LISTING_FEE } from "../utils/marketplace";

export default function MarketplaceListingActions({
  card,
  listingInfo,
  busy,
  onList,
  onUnlist,
  className = "",
  showContainerDivider = true,
  listButtonLabel = "List on Marketplace",
  listedActionLabel,
  listedTagLabel,
}) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState("");
  const [priorityBoost, setPriorityBoost] = useState(false);
  const [localError, setLocalError] = useState("");

  const priceNum = Number(price);
  const totalWithBoost = useMemo(() => {
    if (!Number.isFinite(priceNum) || priceNum < 0) return null;
    return priorityBoost ? priceNum + PRIORITY_LISTING_FEE : priceNum;
  }, [priceNum, priorityBoost]);

  const isListed = Boolean(listingInfo);
  const isPendingTrade = (card.status || "active") === "pending_trade";
  const isActive = (card.status || "active") === "active";

  if (isPendingTrade || !isActive) return null;

  async function handleList(e) {
    e.preventDefault();
    setLocalError("");
    const n = Number(price);
    if (!Number.isFinite(n) || n < 1.0) {
      setLocalError("Asking price must be at least $1.00");
      return;
    }
    try {
      await onList(n, priorityBoost);
      setOpen(false);
      setPrice("");
      setPriorityBoost(false);
    } catch (err) {
      setLocalError(err.message || "Could not list card.");
    }
  }

  async function handleUnlist() {
    setLocalError("");
    try {
      await onUnlist();
    } catch (err) {
      setLocalError(err.message || "Could not remove listing.");
    }
  }

  return (
    <div className={`${showContainerDivider ? "mt-2 space-y-2 border-t border-white/10 pt-2" : "space-y-2"} ${className}`}>
      {isListed ? (
        <>
          {listedTagLabel !== null ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-teal-500/40 bg-teal-500/10 px-2 py-0.5 text-[11px] font-semibold text-teal-200">
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
        </>
      ) : (
        <>
          {!open ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setOpen(true);
                setLocalError("");
                setPriorityBoost(false);
              }}
              className="inline-flex min-h-[40px] w-full items-center justify-center rounded-lg border border-teal-500/35 bg-teal-500/10 px-3 py-2 text-sm font-medium text-teal-100 transition hover:border-teal-400/50 disabled:opacity-50"
            >
              {listButtonLabel}
            </button>
          ) : (
            <form onSubmit={handleList} className="space-y-2 rounded-lg border border-white/10 bg-cardBg2 p-3">
              <label className="block text-xs font-medium text-slate-400">Asking Price ($)</label>
              <input
                type="number"
                min="1.00"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="min-h-[42px] w-full rounded-lg border border-white/15 bg-cardBg px-3 py-2 text-sm text-slate-100"
                placeholder="1.00"
              />
              <p className="text-xs text-slate-500">Minimum $1.00</p>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3">
                <input
                  type="checkbox"
                  checked={priorityBoost}
                  onChange={(e) => setPriorityBoost(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-white/20 bg-cardBg text-amber-500 focus:ring-amber-400/50"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-amber-100">
                    Boost to top of marketplace — {formatMoney(PRIORITY_LISTING_FEE)}
                  </span>
                  <span className="mt-1 block text-xs text-slate-400">
                    Your card will appear at the top of all listings for 7 days.
                  </span>
                  <span className="mt-2 block text-[11px] italic text-amber-200/80">
                    Priority boost payment coming soon.
                  </span>
                </span>
              </label>
              {priorityBoost && totalWithBoost != null ? (
                <p className="text-xs text-amber-200/90">
                  Listing total when boost is enabled:{" "}
                  <span className="font-semibold">{formatMoney(totalWithBoost)}</span>{" "}
                  <span className="text-slate-500">(price + boost; payment not charged yet)</span>
                </p>
              ) : null}
              <ListFormActions busy={busy} onCancel={() => setOpen(false)} />
            </form>
          )}
        </>
      )}
      {localError ? <p className="text-xs text-rose-300">{localError}</p> : null}
    </div>
  );
}

function ListFormActions({ busy, onCancel }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-[40px] flex-1 items-center justify-center rounded-lg bg-neonTeal px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
      >
        {busy ? "Listing…" : "List Card"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onCancel}
        className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-white/20 px-3 py-2 text-sm text-slate-300"
      >
        Cancel
      </button>
    </div>
  );
}
