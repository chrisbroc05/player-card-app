import React from "react";
import { formatMoney } from "../utils/marketplace";

const ICON_STANDARD = (
  <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const ICON_HIGHLIGHT = (
  <svg className="h-10 w-10 text-teal-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
  </svg>
);

const ICON_ANIMATED = (
  <svg className="h-10 w-10 text-violet-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

function priceLabel(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return "Free";
  return `+ ${formatMoney(n)}`;
}

export default function CardTypeStep({
  value,
  onChange,
  highlightCardPrice = 5,
  animatedUpgradePrice = 10,
}) {
  const selected = value || "standard";

  return (
    <div className="grid gap-6">
      <div>
        <h3 className="text-lg font-semibold text-white">Choose Your Card Type</h3>
        <p className="mt-1 text-sm text-slate-400">
          Pick a standard AI card, upload your real highlight clip, or add AI-generated motion.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <button
          type="button"
          onClick={() => onChange("standard")}
          className={`rounded-2xl border p-5 text-left transition ${
            selected === "standard"
              ? "border-white/25 bg-cardBg2 shadow-lg"
              : "border-white/10 bg-cardBg2/50 opacity-80 hover:opacity-95"
          }`}
        >
          <div className="mb-3">{ICON_STANDARD}</div>
          <p className="text-base font-semibold text-white">Standard Card</p>
          <p className="mt-1 text-sm text-slate-400">A premium AI-generated trading card of your player</p>
          <p className="mt-3 text-sm font-medium text-neonTeal">Free</p>
          <p className="mt-1 text-xs text-slate-500">No additional charge beyond tier price</p>
        </button>

        <button
          type="button"
          onClick={() => onChange("highlight")}
          className={`relative overflow-hidden rounded-2xl border p-5 text-left transition ${
            selected === "highlight"
              ? "border-teal-400/70 bg-teal-500/10 shadow-[0_0_28px_rgba(45,212,191,0.22)]"
              : "border-white/10 bg-cardBg2/50 opacity-80 hover:opacity-95"
          }`}
        >
          <span className="absolute right-3 top-3 rounded-full border border-teal-400/50 bg-teal-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-100">
            New
          </span>
          <div className="mb-3">{ICON_HIGHLIGHT}</div>
          <p className="text-base font-semibold text-white">Highlight Card</p>
          <p className="mt-1 text-sm text-slate-400">
            Upload your real highlight video — your actual moment on your card
          </p>
          <p className="mt-3 text-sm font-medium text-teal-200">{priceLabel(highlightCardPrice)}</p>
          <p className="mt-1 text-xs text-slate-500">Max 10 seconds. Record or upload from your camera roll.</p>
        </button>

        <button
          type="button"
          onClick={() => onChange("animated")}
          className={`relative overflow-hidden rounded-2xl border p-5 text-left transition ${
            selected === "animated"
              ? "border-violet-400/70 bg-violet-500/10 shadow-[0_0_28px_rgba(167,139,250,0.22)]"
              : "border-white/10 bg-cardBg2/50 opacity-80 hover:opacity-95"
          }`}
        >
          <span className="absolute right-3 top-3 rounded-full border border-amber-400/50 bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-100">
            Premium
          </span>
          <div className="mb-3">{ICON_ANIMATED}</div>
          <p className="text-base font-semibold text-white">AI Animated Card</p>
          <p className="mt-1 text-sm text-slate-400">
            AI animates your uploaded player photo inside the card frame — clear, single-subject
            photos work best.
          </p>
          <p className="mt-3 text-sm font-medium text-violet-200">{priceLabel(animatedUpgradePrice)}</p>
        </button>
      </div>
    </div>
  );
}
