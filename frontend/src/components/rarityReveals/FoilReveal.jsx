import React from "react";
import {
  RadialParticles,
  RevealActionButtons,
  RevealCardDisplay,
  useRevealPhases,
} from "./RevealShared";

export default function FoilReveal({
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
      { at: 300, index: 1 },
      { at: 900, index: 2 },
      { at: 1400, index: 3 },
      { at: 2600, index: 4 },
    ],
    resetKey
  );

  return (
    <div className="rre-scene rre-scene--foil" aria-live="polite">
      <div className={`rre-card-stage rre-card-stage--bounce${phase >= 0 ? " rre-card-stage--visible" : ""}`}>
        <div className={`rre-card-frame${phase >= 2 ? " rre-card-frame--foil-pulse" : ""}`}>
          <RevealCardDisplay revealCard={revealCard} playerName={playerName} />
          {phase >= 1 && phase < 3 ? <div className="foil-reveal-overlay" aria-hidden /> : null}
        </div>
      </div>
      {phase >= 1 && phase < 4 ? <RadialParticles count={20} tone="gold" /> : null}
      {phase >= 3 ? <p className="rre-message rre-message--foil">Foil Pull!</p> : null}
      <RevealActionButtons
        show={showActions && phase >= 4}
        primaryActionLabel={primaryActionLabel}
        onPrimaryAction={onPrimaryAction}
        onGenerateAnother={onGenerateAnother}
        onStartOver={onStartOver}
      />
    </div>
  );
}
