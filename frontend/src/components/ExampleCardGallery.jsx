import React from "react";
import { Link } from "react-router-dom";
import { vaultTierBadge, formatEditionShort, rarityDisplay } from "../utils/tierStyles";
import { STUDIO_EXAMPLE_CARDS } from "../data/studioMockExamples";

export default function ExampleCardGallery({ examples = STUDIO_EXAMPLE_CARDS }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-cardBg p-4 shadow-xl shadow-black/30 sm:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Example card styles</h2>
        <p className="mt-1 text-xs text-slate-400">
          Static previews of tier looks —{" "}
          <Link to="/register" className="font-medium text-neonTeal underline decoration-neonTeal/30 underline-offset-2">
            sign up
          </Link>{" "}
          to build your own collectible.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {examples.map((card) => {
          const badge = vaultTierBadge(card.tier);
          return (
            <article
              key={card.id}
              className="group rounded-xl border border-white/10 bg-cardBg2 p-3 transition duration-200 hover:border-neonBlue/40"
            >
              <div
                className={`flex aspect-[3/4] w-full flex-col justify-end rounded-lg border-2 p-3 text-left ${card.panelClass}`}
              >
                <p className="text-sm font-bold text-white drop-shadow-md">{card.player_name}</p>
                <p className="text-[11px] text-white/80 drop-shadow">{card.team_name}</p>
              </div>
              <div className="mt-2 space-y-1 text-xs text-slate-300">
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
    </section>
  );
}
