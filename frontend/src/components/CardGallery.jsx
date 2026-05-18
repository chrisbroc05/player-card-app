import React from "react";
import { Link } from "react-router-dom";
import CardImage from "./CardImage";
import { CardSharePopover } from "./ShareCard";
import { vaultTierBadge, formatEditionShort, rarityDisplay } from "../utils/tierStyles";
import { CARD_IMAGE_FRAME, CARD_IMAGE_FRAME_ANIMATED } from "../utils/cardImageStyles";
import { isAnimatedCard } from "../utils/animationCard";

export default function CardGallery({ cards }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-cardBg p-4 shadow-xl shadow-black/30 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">Card Gallery</h2>
        <span className="text-xs text-slate-400">{cards.length} card(s)</span>
      </div>

      {cards.length === 0 ? (
        <div className="flex min-h-[140px] items-center justify-center rounded-xl border border-dashed border-white/20 bg-cardBg2">
          <p className="text-sm text-slate-400">No generated cards yet.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const badge = vaultTierBadge(card.tier);
            const key = card.card_id || card.id;
            return (
              <article
                key={key}
                className="group rounded-xl border border-white/10 bg-cardBg2 p-3 transition duration-200 hover:scale-[1.02] hover:border-neonBlue/50 hover:shadow-glowBlue"
              >
                <div className="relative">
                  <Link
                    to={card.shareable_slug ? `/card/${encodeURIComponent(card.shareable_slug)}` : "/my-collection"}
                    className="block"
                  >
                    <CardImage
                      card={card}
                      alt={card.player_name || "Card"}
                      cacheBust={card.created_at}
                      frameClassName={isAnimatedCard(card) ? CARD_IMAGE_FRAME_ANIMATED : CARD_IMAGE_FRAME}
                      playOnHover
                      forcePlay={Boolean(card.is_animated)}
                    />
                  </Link>
                  <div className="absolute right-2 top-2">
                    <CardSharePopover card={card} />
                  </div>
                </div>
                <div className="mt-2 space-y-1 text-xs text-slate-300">
                  <p className="font-medium text-slate-100">{card.player_name || "Player"}</p>
                  <div className="flex flex-wrap gap-1">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${badge.pill}`}>{badge.label}</span>
                    <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-slate-400">
                      {rarityDisplay(card.rarity)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{formatEditionShort(card.edition_number, card.print_run)}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
