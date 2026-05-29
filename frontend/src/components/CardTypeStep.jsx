import React from "react";

const ICON_STANDARD = (
  <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const ICON_ANIMATED = (
  <svg className="h-10 w-10 text-violet-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
  </svg>
);

export default function CardTypeStep({ value, onChange, animatedUpgradePrice = 10 }) {
  const isAnimated = value === "animated";
  const upgradeLabel =
    Number(animatedUpgradePrice) > 0
      ? `+ ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(animatedUpgradePrice))}`
      : "Included";

  return (
    <div className="grid gap-6">
      <div>
        <h3 className="text-lg font-semibold text-white">Choose Your Card Type</h3>
        <p className="mt-1 text-sm text-slate-400">
          Standard cards are a single image. Animated cards bring your player to life with AI-generated motion.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onChange("standard")}
          className={`rounded-2xl border p-5 text-left transition ${
            !isAnimated
              ? "border-white/25 bg-cardBg2"
              : "border-white/10 bg-cardBg2/50 opacity-75 hover:opacity-90"
          }`}
        >
          <div className="mb-3">{ICON_STANDARD}</div>
          <p className="text-base font-semibold text-white">Standard Card</p>
          <p className="mt-1 text-sm text-slate-400">Classic trading card with AI-generated artwork</p>
          <p className="mt-3 text-sm font-medium text-neonTeal">Included</p>
        </button>

        <button
          type="button"
          onClick={() => onChange("animated")}
          className={`relative overflow-hidden rounded-2xl border p-5 text-left transition ${
            isAnimated
              ? "border-violet-400/70 bg-violet-500/10 shadow-[0_0_28px_rgba(167,139,250,0.22)]"
              : "border-white/10 bg-cardBg2/50 opacity-80 hover:opacity-95"
          }`}
        >
          <span className="absolute right-3 top-3 rounded-full border border-amber-400/50 bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-100">
            Premium
          </span>
          <div className="mb-3">{ICON_ANIMATED}</div>
          <p className="text-base font-semibold text-white">Animated Card</p>
          <p className="mt-1 text-sm text-slate-400">
            Your player comes to life with 3 seconds of AI-generated motion
          </p>
          <p className="mt-3 text-sm font-medium text-violet-200">{upgradeLabel}</p>
        </button>
      </div>
    </div>
  );
}
