import React, { useState } from "react";
import { formatMoney } from "../utils/marketplace";

export default function MarketplaceListingActions({
  card,
  listingInfo,
  busy,
  onList,
  onUnlist,
}) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState("");
  const [localError, setLocalError] = useState("");

  const isListed = Boolean(listingInfo);
  const isPendingTrade = (card.status || "active") === "pending_trade";
  const isActive = (card.status || "active") === "active";

  if (isPendingTrade || !isActive) return null;

  async function handleList(e) {
    e.preventDefault();
    setLocalError("");
    const n = Number(price);
    if (!Number.isFinite(n) || n <= 0) {
      setLocalError("Enter a price greater than $0.00");
      return;
    }
    try {
      await onList(n);
      setOpen(false);
      setPrice("");
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
    <div className="mt-2 space-y-2 border-t border-white/10 pt-2">
      {isListed ? (
        <>
          <span className="inline-flex rounded-full border border-teal-500/40 bg-teal-500/10 px-2 py-0.5 text-[11px] font-semibold text-teal-200">
            Listed on Free Agency · {formatMoney(listingInfo.asking_price)}
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={handleUnlist}
            className="inline-flex min-h-[40px] w-full items-center justify-center rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-rose-400/40 hover:bg-rose-500/10 disabled:opacity-50"
          >
            {busy ? "Updating…" : "Remove from Free Agency"}
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
              }}
              className="inline-flex min-h-[40px] w-full items-center justify-center rounded-lg border border-teal-500/35 bg-teal-500/10 px-3 py-2 text-sm font-medium text-teal-100 transition hover:border-teal-400/50 disabled:opacity-50"
            >
              List on Free Agency
            </button>
          ) : (
            <form onSubmit={handleList} className="space-y-2 rounded-lg border border-white/10 bg-cardBg2 p-3">
              <label className="block text-xs font-medium text-slate-400">Asking Price ($)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="min-h-[42px] w-full rounded-lg border border-white/15 bg-cardBg px-3 py-2 text-sm text-slate-100"
                placeholder="0.00"
              />
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
