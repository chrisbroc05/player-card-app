import React from "react";

const ICON_STATIC = (
  <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const ICON_HIGHLIGHT = (
  <svg className="h-10 w-10 text-brand-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
  </svg>
);

export default function CardTypeStep({ value, onChange }) {
  const selected = value === "highlight" ? "highlight" : "standard";

  const options = [
    {
      id: "standard",
      label: "Static",
      description: "A classic trading card with AI-generated artwork",
      icon: ICON_STATIC,
      selectedClass: "border-white/25 bg-cardBg2 shadow-lg",
    },
    {
      id: "highlight",
      label: "Highlight",
      description: "Upload a video clip as your card background",
      icon: ICON_HIGHLIGHT,
      selectedClass: "border-[var(--color-border-gold)] bg-gold-subtle shadow-[0_0_28px_rgba(45,212,191,0.22)]",
    },
  ];

  return (
    <div className="grid gap-6">
      <div>
        <h3 className="text-lg font-semibold text-white">Choose Your Card Type</h3>
        <p className="mt-1 text-sm text-slate-400">Pick how you want your player card to look.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {options.map((opt) => {
          const isSel = selected === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`rounded-2xl border p-5 text-left transition ${
                isSel ? opt.selectedClass : "border-white/10 bg-cardBg2/50 opacity-80 hover:opacity-95"
              }`}
            >
              <div className="mb-3">{opt.icon}</div>
              <p className={`text-base font-semibold ${isSel && opt.id === "highlight" ? "text-brand-gold-bright" : "text-white"}`}>
                {opt.label}
              </p>
              <p className="mt-1 text-sm text-slate-400">{opt.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
