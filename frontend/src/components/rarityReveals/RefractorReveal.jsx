import React from "react";
import {
  RadialParticles,
  RevealActionButtons,
  RevealCardDisplay,
  useRevealPhases,
} from "./RevealShared";

export default function RefractorReveal({
  revealCard,
  playerName,
  showActions,
  primaryActionLabel,
  onPrimaryAction,
  onGenerateAnother,
  onStartOver,
}) {
  const resetKey = `${revealCard?.card_id}-${revealCard?.image_url}`;
  const phase = useRevealPhases(
    [
      { at: 0, index: 0 },
      { at: 120, index: 1 },
      { at: 400, index: 2 },
      { at: 1100, index: 3 },
      { at: 1800, index: 4 },
      { at: 2600, index: 5 },
      { at: 4200, index: 6 },
    ],
    resetKey
  );

  return (
    <div className="rre-scene rre-scene--refractor" aria-live="polite">
      {phase >= 1 ? <div className="rre-flash rre-flash--silver" aria-hidden /> : null}
      <div
        className={`rre-card-stage rre-card-stage--refractor-slide${phase >= 2 ? " rre-card-stage--visible" : ""}`}
      >
        <div className={`rre-card-frame${phase >= 3 ? " rre-card-frame--refractor-cycle" : ""}`}>
          <RevealCardDisplay revealCard={revealCard} playerName={playerName} />
          {phase >= 4 && phase < 6 ? <div className="rre-rainbow-ray" aria-hidden /> : null}
        </div>
      </div>
      {phase >= 3 && phase < 6 ? <RadialParticles count={30} tone="silver" /> : null}
      {phase >= 5 ? <p className="rre-message rre-message--refractor">Refractor Pull!</p> : null}
      <RevealActionButtons
        show={showActions && phase >= 6}
        primaryActionLabel={primaryActionLabel}
        onPrimaryAction={onPrimaryAction}
        onGenerateAnother={onGenerateAnother}
        onStartOver={onStartOver}
      />
    </div>
  );
}
