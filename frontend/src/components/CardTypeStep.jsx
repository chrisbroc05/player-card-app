import React from "react";
import { WizardOptionCheckmark } from "./StudioWizardControls";

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

const ICON_ANIMATED = (
  <svg className="h-10 w-10 text-violet-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

const SELECTED_CARD_CLASS =
  "border-[var(--color-border-gold)] bg-gold-subtle shadow-[0_0_28px_rgba(201,168,76,0.28)] ring-1 ring-[var(--color-border-gold)]";
const UNSELECTED_CARD_CLASS =
  "border-white/10 bg-cardBg2/40 opacity-50 hover:border-white/20 hover:opacity-70";

export default function CardTypeStep({ value, onChange }) {
  const selected = value || "standard";

  const options = [
    {
      id: "standard",
      label: "Static",
      description: "A classic trading card with AI-generated artwork",
      icon: ICON_STATIC,
    },
    {
      id: "highlight",
      label: "Highlight",
      description: "Upload a video clip as your card background",
      icon: ICON_HIGHLIGHT,
    },
    {
      id: "animated",
      label: "Animated",
      description: "Your static card brought to life with AI animation",
      icon: ICON_ANIMATED,
    },
  ];

  return (
    <div className="grid gap-6">
      <div>
        <h3 className="text-lg font-semibold text-white">Choose Your Card Type</h3>
        <p className="mt-1 text-sm text-slate-400">Pick how you want your player card to look.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {options.map((opt) => {
          const isSel = selected === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`relative rounded-2xl border p-5 text-left transition ${
                isSel ? SELECTED_CARD_CLASS : UNSELECTED_CARD_CLASS
              }`}
            >
              {isSel ? <WizardOptionCheckmark /> : null}
              <div className={`mb-3 ${isSel ? "" : "opacity-80"}`}>{opt.icon}</div>
              <p className={`text-base font-semibold ${isSel ? "text-brand-gold-bright" : "text-slate-300"}`}>
                {opt.label}
              </p>
              <p className={`mt-1 text-sm ${isSel ? "text-slate-300" : "text-slate-500"}`}>{opt.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
