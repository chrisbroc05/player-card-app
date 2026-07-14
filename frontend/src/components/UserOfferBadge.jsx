import React from "react";
import { formatMoney } from "../utils/marketplace";

/**
 * Badge for the current user's offer status on a marketplace listing card.
 * Only render when the viewer is logged in and does not own the listing.
 */
export default function UserOfferBadge({ listing, currentUserId }) {
  if (!currentUserId || listing?.owner_id === currentUserId) return null;
  if (listing?.pending_offer == null) return null;

  if (listing.pending_offer && listing.offer_amount != null) {
    return (
      <span className="inline-flex max-w-[calc(100%-0.5rem)] items-center rounded-full border border-amber-400/45 bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold leading-tight text-amber-100 shadow-sm backdrop-blur-sm">
        Your offer: {formatMoney(listing.offer_amount)} pending
      </span>
    );
  }

  if (listing.previous_offer && listing.offer_amount != null) {
    return (
      <span className="inline-flex max-w-[calc(100%-0.5rem)] items-center rounded-full border border-white/15 bg-slate-700/75 px-2 py-0.5 text-[10px] font-medium leading-tight text-slate-300 shadow-sm backdrop-blur-sm">
        Previously offered {formatMoney(listing.offer_amount)}
      </span>
    );
  }

  return null;
}
