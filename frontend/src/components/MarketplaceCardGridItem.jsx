import React from "react";
import { Link } from "react-router-dom";
import CardImage from "./CardImage";
import { vaultTierBadge } from "../utils/tierStyles";
import { formatMoney, listingExpiresLabel, listingExpiresSubtextClass } from "../utils/marketplace";
import { CARD_IMAGE_FRAME, CARD_IMAGE_FRAME_ANIMATED } from "../utils/cardImageStyles";
import { isAnimatedCard } from "../utils/animationCard";

export default function MarketplaceCardGridItem({ listing }) {
  const badge = vaultTierBadge(listing.tier);
  const cardPath = `/marketplace/${encodeURIComponent(listing.card_id)}`;

  return (
    <Link
      to={cardPath}
      className={`group flex flex-col rounded-2xl border border-white/10 bg-cardBg p-3 shadow-lg transition duration-300 hover:border-white/20 hover:scale-[1.02] ${badge.glow}`}
    >
      <CardImage
        card={listing}
        alt={listing.player_name}
        frameClassName={isAnimatedCard(listing) ? CARD_IMAGE_FRAME_ANIMATED : CARD_IMAGE_FRAME}
        playOnHover
        forcePlay={Boolean(listing.is_animated)}
      />
      <div className="mt-3 flex flex-1 flex-col space-y-1.5 px-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.pill}`}>
            {badge.label}
          </span>
        </div>
        <p className="truncate font-semibold text-white">{listing.player_name}</p>
        <p className="truncate text-xs text-slate-400">{listing.team_name}</p>
        <p className="text-lg font-bold text-neonTeal">{formatMoney(listing.asking_price)}</p>
        {listing.days_remaining != null && listing.listing_expires_at ? (
          <p className={`text-[11px] ${listingExpiresSubtextClass(listing.days_remaining)}`}>
            {listingExpiresLabel(listing.days_remaining)}
          </p>
        ) : null}
        <p className="text-xs text-slate-500">Listed by {listing.owner_display_name}</p>
        <span className="mt-2 block rounded-lg border border-teal-500/35 bg-teal-500/10 py-2 text-center text-xs font-semibold text-neonTeal transition group-hover:bg-neonTeal/20 sm:opacity-0 sm:group-hover:opacity-100">
          Make Offer
        </span>
      </div>
    </Link>
  );
}
