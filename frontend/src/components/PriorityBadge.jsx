import React from "react";
import { isActivePriorityListing } from "../utils/marketplace";

/** Shown on priority marketplace listings when backend sets is_priority_listing */
export default function PriorityBadge({ className = "" }) {
  return (
    <span
      className={`pointer-events-none inline-flex items-center rounded-md border border-amber-400/60 bg-amber-500/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-amber-100 shadow-[0_0_10px_rgba(251,191,36,0.35)] ${className}`}
    >
      Priority
    </span>
  );
}

export function isPriorityListing(listing) {
  return isActivePriorityListing(listing);
}
