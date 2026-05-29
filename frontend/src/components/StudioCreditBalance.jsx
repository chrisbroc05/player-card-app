import React from "react";
import { Link } from "react-router-dom";
import { formatMoney } from "../utils/marketplace";

const WALLET_ICON = (
  <svg className="h-4 w-4 text-neonTeal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
    />
  </svg>
);

export default function StudioCreditBalance({ balance }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-neonTeal/30 bg-neonTeal/10 px-4 py-3">
      {WALLET_ICON}
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Balance</span>
      <span className="text-sm font-bold tabular-nums text-neonTeal sm:text-base">{formatMoney(balance)}</span>
      <Link
        to="/credits"
        target="_blank"
        rel="noreferrer"
        className="ml-auto text-xs font-medium text-neonTeal underline decoration-neonTeal/40 underline-offset-2 hover:text-teal-200"
      >
        Add credits
      </Link>
    </div>
  );
}
