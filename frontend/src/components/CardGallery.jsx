import React from "react";
import { toApiUrl } from "../config/api";

function inferTier(style) {
  const s = (style || "").toLowerCase();
  if (s.includes("legendary")) return "1-OF-1";
  if (s.includes("rare")) return "RARE";
  return "BASE";
}

export default function CardGallery({ cards }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-cardBg p-5 shadow-xl shadow-black/30 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Card Gallery</h2>
        <span className="text-xs text-slate-400">{cards.length} card(s)</span>
      </div>

      {cards.length === 0 ? (
        <div className="flex min-h-[140px] items-center justify-center rounded-xl border border-dashed border-white/20 bg-cardBg2">
          <p className="text-sm text-slate-400">No generated cards yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <article
              key={card.id}
              className="group rounded-xl border border-white/10 bg-cardBg2 p-3 transition duration-200 hover:scale-[1.02] hover:border-neonBlue/50 hover:shadow-glowBlue"
            >
              <img
                src={toApiUrl(card.image_url)}
                alt={`Card ${card.id}`}
                className="w-full rounded-lg border border-white/10"
              />
              <div className="mt-2 space-y-1 text-xs text-slate-300">
                <p className="font-medium text-slate-100">#{card.id} · Player #{card.player_id}</p>
                <p className="text-neonBlue">{inferTier(card.style)}</p>
                <p className="truncate text-slate-400">{card.style}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
