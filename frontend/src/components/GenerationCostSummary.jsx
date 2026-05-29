import React from "react";
import { Link } from "react-router-dom";
import { formatMoney } from "../utils/marketplace";

export default function GenerationCostSummary({
  playerName,
  tierLabel,
  cardTypeLabel,
  isAnimated,
  pricing,
  creditBalance,
  showBalance = true,
}) {
  if (!pricing) return null;

  const additional = Number(pricing.additional_preview_price) || 0;
  const animated = Number(pricing.animated_upgrade_price) || 0;
  const balance = Number(creditBalance) || 0;
  const dueNow = isAnimated ? animated : 0;
  const shortfall = Math.max(0, dueNow - balance);

  return (
    <div className="rounded-xl border border-white/10 bg-cardBg2 p-4 text-sm text-slate-300">
      <p className="font-medium text-white">Order Summary</p>
      <div className="mt-3 space-y-1">
        <p>
          Card: <span className="font-medium text-white">{playerName || "Your player"}</span>
        </p>
        <p>
          Tier: <span className="font-medium text-white">{tierLabel}</span>
        </p>
        <p>
          Type: <span className="font-medium text-white">{cardTypeLabel}</span>
        </p>
      </div>

      <div className="mt-4 rounded-lg border border-white/10 bg-cardBg/80 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Cost breakdown</p>
        <div className="mt-2 space-y-1.5">
          <div className="flex justify-between gap-4">
            <span>First preview</span>
            <span className="font-medium text-emerald-300">FREE</span>
          </div>
          {!isAnimated ? (
            <div className="flex justify-between gap-4">
              <span>Additional previews</span>
              <span className="font-medium text-white">{formatMoney(additional)} each</span>
            </div>
          ) : null}
          {isAnimated ? (
            <div className="flex justify-between gap-4">
              <span>Animated upgrade</span>
              <span className="font-medium text-white">{formatMoney(animated)}</span>
            </div>
          ) : null}
          {isAnimated ? (
            <div className="mt-2 flex justify-between gap-4 border-t border-white/10 pt-2 font-semibold text-white">
              <span>Total due now</span>
              <span className="text-neonTeal">{formatMoney(dueNow)}</span>
            </div>
          ) : null}
        </div>
      </div>

      {showBalance ? (
        <p className="mt-3 text-sm">
          Your credit balance:{" "}
          <span className="font-semibold tabular-nums text-neonTeal">{formatMoney(balance)}</span>
        </p>
      ) : null}

      {shortfall > 0 ? (
        <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
          <p className="font-medium text-amber-50">
            You need {formatMoney(dueNow)} in credits to generate this card.
          </p>
          <p className="mt-1">Your current balance: {formatMoney(balance)}</p>
          <p className="mt-1">You need {formatMoney(shortfall)} more.</p>
          <Link
            to="/credits"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex min-h-[40px] items-center justify-center rounded-lg bg-neonTeal px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Add Credits
          </Link>
        </div>
      ) : null}
    </div>
  );
}
