import React from "react";

const FEATURES = [
  { icon: "⚡", text: "AI-generated in seconds" },
  { icon: "🃏", text: "Multiple rarities and themes" },
  { icon: "🏆", text: "Trade and sell on the marketplace" },
];

export default function StudioWelcomeScreen({ onStart }) {
  return (
    <div className="studio-welcome">
      <div className="studio-welcome__icon" aria-hidden>
        ⚡
      </div>
      <h1 className="studio-welcome__title">Create Your Legend</h1>
      <p className="studio-welcome__subtitle">
        Turn your player into an AI-generated trading card in just a few steps.
      </p>
      <ul className="studio-welcome__features">
        {FEATURES.map(({ icon, text }) => (
          <li key={text} className="studio-welcome__feature">
            <span aria-hidden>{icon}</span>
            <span>{text}</span>
          </li>
        ))}
      </ul>
      <button type="button" className="studio-wizard-continue studio-welcome__cta" onClick={onStart}>
        Let&apos;s Build Your Card →
      </button>
    </div>
  );
}
