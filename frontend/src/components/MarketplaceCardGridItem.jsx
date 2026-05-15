import React from "react";
import { Link } from "react-router-dom";
import CardImage from "./CardImage";
import { vaultTierBadge } from "../utils/tierStyles";
import { formatMoney } from "../utils/marketplace";

export default function MarketplaceCardGridItem({ listing }) {
  const badge = vaultTierBadge(listing.tier);
  const cardPath = `/marketplace/${encodeURIComponent(listing.card_id)}`;

  return (
    <Link
      to={cardPath}
      className={`group block rounded-2xl border border-white/10 bg-cardBg p-3 shadow-lg transition duration-300 hover:border-white/20 hover:scale-[1.02] ${badge.glow}`}
    >
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/30">
        <CardImage
          imageUrl={listing.image_url}
          alt={listing.player_name}
          className="aspect-[3/4] w-full object-cover transition duration-300 group-hover:brightness-110"
        />
        <span
          className={`absolute left-2 top-2 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.pill}`}
        >
          {badge.label}
        </span>
        <span className="absolute bottom-2 left-2 right-2 rounded-lg bg-neonTeal/90 py-2 text-center text-xs font-semibold text-slate-950 sm:hidden">
          Make Offer
        </span>
        <span className="absolute bottom-2 left-2 right-2 hidden rounded-lg bg-black/75 py-2 text-center text-xs font-semibold text-neonTeal backdrop-blur-sm sm:group-hover:block">
          Make Offer
        </span>
      </div>
      <div className="mt-3 space-y-1.5 px-1">
        <p className="truncate font-semibold text-white">{listing.player_name}</p>
        <p className="truncate text-xs text-slate-400">{listing.team_name}</p>
        <p className="text-lg font-bold text-neonTeal">{formatMoney(listing.asking_price)}</p>
        <p className="text-xs text-slate-500">Listed by {listing.owner_display_name}</p>
      </div>
    </Link>
  );
}
