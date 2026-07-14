import React from "react";
import { Link } from "react-router-dom";
import CardImage from "./CardImage";
import AnimatedBadge from "./AnimatedBadge";
import PriorityBadge, { isPriorityListing } from "./PriorityBadge";
import UserOfferBadge from "./UserOfferBadge";
import { vaultTierBadge } from "../utils/tierStyles";
import { formatMoney, listingExpiresLabel, listingExpiresSubtextClass } from "../utils/marketplace";
import {
  CARD_IMAGE_FRAME,
  CARD_IMAGE_FRAME_ANIMATED,
  CARD_IMAGE_FRAME_THUMB,
  CARD_IMAGE_FRAME_THUMB_ANIMATED,
} from "../utils/cardImageStyles";
import { isAnimatedCard } from "../utils/animationCard";

/** @param {"list" | "compact"} [variant] — list = current marketplace cards; compact = thumbnail grid */
export default function MarketplaceCardGridItem({ listing, variant = "list", currentUserId = null }) {
  const badge = vaultTierBadge(listing.tier);
  const cardPath = `/marketplace/${encodeURIComponent(listing.card_id)}`;
  const animated = isAnimatedCard(listing);
  const priority = isPriorityListing(listing);

  if (variant === "compact") {
    return (
      <Link
        to={cardPath}
        className={`group flex flex-col rounded-xl border border-white/10 bg-cardBg p-2 shadow-md transition duration-200 hover:border-white/20 ${animated ? "" : "hover:scale-[1.02]"} ${badge.glow}`}
      >
        <div className="relative">
          <CardImage
            card={listing}
            alt={listing.player_name}
            frameClassName={animated ? CARD_IMAGE_FRAME_THUMB_ANIMATED : CARD_IMAGE_FRAME_THUMB}
            playOnHover
            showAnimatedBadge={false}
            infoBannerVariant="compact"
          />
          <div className="pointer-events-none absolute left-1 top-1 z-10 flex max-w-[calc(100%-0.5rem)] flex-col items-start gap-1">
            <UserOfferBadge listing={listing} currentUserId={currentUserId} />
            {priority ? <PriorityBadge /> : null}
          </div>
          {animated ? (
            <span className="pointer-events-none absolute right-1 top-1 z-10">
              <AnimatedBadge />
            </span>
          ) : null}
        </div>
        <p className="mt-2 px-0.5 text-center text-xs font-bold text-neonTeal">{formatMoney(listing.asking_price)}</p>
      </Link>
    );
  }

  return (
    <Link
      to={cardPath}
      className={`group flex flex-col rounded-2xl border border-white/10 bg-cardBg p-3 shadow-lg transition duration-300 hover:border-white/20 ${animated ? "" : "hover:scale-[1.02]"} ${badge.glow}`}
    >
      <div className="relative">
        <CardImage
          card={listing}
          alt={listing.player_name}
          frameClassName={animated ? CARD_IMAGE_FRAME_ANIMATED : CARD_IMAGE_FRAME}
          playOnHover
          showAnimatedBadge={false}
        />
        <div className="pointer-events-none absolute left-2 top-2 z-10 flex max-w-[calc(100%-1rem)] flex-col items-start gap-1">
          <UserOfferBadge listing={listing} currentUserId={currentUserId} />
          {priority ? <PriorityBadge /> : null}
        </div>
        {animated ? (
          <span className="pointer-events-none absolute right-2 top-2 z-10">
            <AnimatedBadge />
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex flex-1 flex-col space-y-1.5 px-1">
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
