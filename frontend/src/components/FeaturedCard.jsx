import React from "react";
import CardImage from "./CardImage";
import { CARD_IMAGE_FRAME_DETAIL } from "../utils/cardImageStyles";
import { isHighlightCard } from "../utils/highlightCard";
import { isAnimatedCard } from "../utils/animationCard";

export default function FeaturedCard({ card, imageUrl, tier, loading }) {
  const displayCard =
    card ||
    (imageUrl
      ? {
          image_url: imageUrl,
          tier: tier || "rookie",
          player_name: "Your Card",
        }
      : null);

  return (
    <section className="rounded-2xl border border-white/10 bg-cardBg p-4 shadow-xl shadow-black/30 sm:p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-white sm:text-lg">Latest Generated Card</h2>
        <p className="mt-1 text-xs text-slate-400">Consistent card template with UI banner and tier styling.</p>
      </div>

      {loading ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-white/10 bg-cardBg2 sm:min-h-[280px]">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-[var(--color-gold-primary)]" />
          <p className="mt-3 text-sm text-slate-300">Generating your card...</p>
        </div>
      ) : displayCard ? (
        <div className="animate-fadeUp mx-auto max-w-md">
          <CardImage
            card={displayCard}
            alt={displayCard.player_name || "Generated card"}
            frameClassName={CARD_IMAGE_FRAME_DETAIL}
            variant="detail"
            showInfoBanner
            forcePlay={isHighlightCard(displayCard) || isAnimatedCard(displayCard)}
          />
        </div>
      ) : (
        <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-white/20 bg-cardBg2 sm:min-h-[280px]">
          <p className="text-sm text-slate-400">Generate a card to see it featured here.</p>
        </div>
      )}
    </section>
  );
}
