import React from "react";
import CardImage from "./CardImage";
import { CARD_IMAGE_FRAME_MODAL } from "../utils/cardImageStyles";
import { rarityDisplay, vaultTierBadge } from "../utils/tierStyles";

export const MARKETPLACE_MODAL_OVERLAY_CLASS =
  "fixed inset-0 flex items-center justify-center bg-black/70 p-4";

export function marketplaceModalPanelClass(borderClass = "border-white/10") {
  return `w-full min-w-0 max-w-lg rounded-2xl border ${borderClass} bg-cardBg p-6 shadow-2xl shadow-black/50 sm:min-w-[420px]`;
}

export function MarketplaceModalCardSection({ card, children, centered = false }) {
  const alignment = centered
    ? "items-center text-center sm:items-start sm:text-left"
    : "items-center sm:items-start";

  return (
    <div className={`flex flex-col gap-6 ${alignment} sm:flex-row sm:gap-6`}>
      <div className="mx-auto w-full min-w-[200px] max-w-[240px] shrink-0 sm:mx-0">
        <CardImage card={card} alt={card?.player_name} frameClassName={CARD_IMAGE_FRAME_MODAL} />
      </div>
      <div className="w-full min-w-0 flex-1 space-y-3">{children}</div>
    </div>
  );
}

export function MarketplaceModalCardDetails({ listing, extra = null }) {
  const badge = vaultTierBadge(listing?.tier);

  return (
    <>
      <p className="text-base font-semibold leading-snug text-white break-words">
        {listing?.player_name || "Card"}
      </p>
      {listing?.team_name ? (
        <p className="text-[13px] leading-relaxed text-slate-400 break-words">{listing.team_name}</p>
      ) : null}
      {listing?.tier ? (
        <div className="pt-1">
          <span
            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[13px] font-medium ${badge.pill}`}
          >
            {badge.label}
          </span>
        </div>
      ) : null}
      {listing?.card_id ? (
        <p className="font-mono text-[13px] leading-relaxed text-neonTeal/90 break-all">
          {listing.card_id}
        </p>
      ) : null}
      {listing?.rarity ? (
        <p className="text-[13px] text-slate-400">{rarityDisplay(listing.rarity)}</p>
      ) : null}
      {extra}
    </>
  );
}
