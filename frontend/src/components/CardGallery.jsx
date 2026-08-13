import React from "react";
import { Link } from "react-router-dom";
import CardImage from "./CardImage";
import { CardSharePopover } from "./ShareCard";
import { cardMediaFrameClass, cardPlaysVideoOnHover } from "../utils/highlightCard";

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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const key = card.card_id || card.id;
            const videoCard = cardPlaysVideoOnHover(card);
            return (
              <article
                key={key}
                className={`group rounded-xl border border-white/10 bg-cardBg2 p-3 transition duration-200 hover:border-[var(--color-gold-bright/50] hover:shadow-glowGold ${
                  videoCard ? "" : "hover:scale-[1.02]"
                }`}
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
                      frameClassName={cardMediaFrameClass(card)}
                      playOnHover
                      showInfoBanner
                    />
                  </Link>
                  <div className="absolute right-2 top-2">
                    <CardSharePopover card={card} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
