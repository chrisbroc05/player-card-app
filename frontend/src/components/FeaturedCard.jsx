import React from "react";

function tierBadge(tier) {
  const normalized = (tier || "base").toLowerCase();
  if (normalized === "legendary") {
    return {
      label: "1-OF-1",
      className: "bg-amber-300/20 text-amber-200 border-amber-300/40",
    };
  }
  if (normalized === "rare") {
    return {
      label: "RARE",
      className: "bg-cyan-300/20 text-cyan-200 border-cyan-300/40",
    };
  }
  return {
    label: "BASE",
    className: "bg-slate-300/20 text-slate-200 border-slate-300/40",
  };
}

export default function FeaturedCard({ imageUrl, tier, loading }) {
  const badge = tierBadge(tier);

  return (
    <section className="rounded-2xl border border-white/10 bg-cardBg p-5 shadow-xl shadow-black/30 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Latest Generated Card</h2>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {loading ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-white/10 bg-cardBg2">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-neonBlue" />
          <p className="mt-3 text-sm text-slate-300">Generating your card...</p>
        </div>
      ) : imageUrl ? (
        <div className="animate-fadeUp">
          <img
            src={imageUrl}
            alt="Generated baseball card"
            className="mx-auto w-full max-w-2xl rounded-xl border border-white/15 shadow-2xl shadow-black/50"
          />
        </div>
      ) : (
        <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-white/20 bg-cardBg2">
          <p className="text-sm text-slate-400">Generate a card to see it featured here.</p>
        </div>
      )}
    </section>
  );
}
