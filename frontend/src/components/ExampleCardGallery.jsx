import React from "react";
import { Link } from "react-router-dom";
import { vaultTierBadge, formatEditionShort, rarityDisplay } from "../utils/tierStyles";
import { STUDIO_EXAMPLE_CARDS } from "../data/studioMockExamples";

function MockPhotoArea({ photoClass }) {
  return (
    <div
      className={`relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-md bg-gradient-to-b ${photoClass}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(255,255,255,0.12),transparent_55%)]" />
      <div className="relative flex h-24 w-20 flex-col items-center justify-end rounded-sm border border-white/15 bg-black/25 px-1 pb-1 shadow-inner">
        <div className="mb-1 h-10 w-10 rounded-full border border-white/20 bg-white/10" aria-hidden />
        <div className="h-1 w-8 rounded-full bg-white/20" aria-hidden />
      </div>
      <p className="relative mt-2 px-2 text-center text-[9px] font-medium uppercase tracking-wider text-white/50">
        Your photo here
      </p>
    </div>
  );
}

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
                className={`flex aspect-[3/4] w-full flex-col overflow-hidden rounded-lg border-2 p-2 shadow-lg ${card.panelClass}`}
              >
                <div className="mb-1.5 flex items-center justify-between gap-1 border-b border-white/10 pb-1.5">
                  <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/70">Future Legends</span>
                  <div className="flex shrink-0 flex-wrap justify-end gap-0.5">
                    <span className={`rounded px-1 py-0.5 text-[8px] font-semibold leading-none ${badge.pill}`}>
                      {badge.label}
                    </span>
                    <span className="rounded border border-white/20 bg-black/20 px-1 py-0.5 text-[8px] text-white/80">
                      {rarityDisplay(card.rarity)}
                    </span>
                  </div>
                </div>

                <MockPhotoArea photoClass={card.photoClass} />

                <div className="mt-2 space-y-1 rounded-md border border-white/10 bg-black/30 p-2 backdrop-blur-sm">
                  <p className="truncate text-sm font-bold leading-tight text-white drop-shadow-sm">{card.player_name}</p>
                  <p className="truncate text-[11px] text-white/85">{card.team_name}</p>
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-white/65">
                    <span>#{card.jersey_number}</span>
                    <span>{card.position}</span>
                    <span>’{String(card.grad_year).slice(-2)}</span>
                  </div>
                  <p className="text-[9px] text-white/45">{formatEditionShort(card.edition_number, card.print_run)}</p>
                </div>
              </div>
              <p className="mt-2 text-center text-[10px] text-slate-500">Demo layout — not a real generated card</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
