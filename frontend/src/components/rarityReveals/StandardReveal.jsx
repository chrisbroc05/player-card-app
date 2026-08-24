import React from "react";
import { ConfettiRain, RevealActionButtons, RevealCardDisplay, useRevealPhases } from "./RevealShared";

export default function StandardReveal({
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
      { at: 400, index: 1 },
      { at: 2800, index: 2 },
    ],
    resetKey
  );

  return (
    <div className="rre-scene rre-scene--standard" aria-live="polite">
      {phase >= 1 ? <ConfettiRain count={28} /> : null}
      <div className={`rre-card-stage rre-card-stage--bounce${phase >= 1 ? " rre-card-stage--visible" : ""}`}>
        <RevealCardDisplay revealCard={revealCard} playerName={playerName} />
      </div>
      {phase >= 1 ? (
        <p className="rre-message rre-message--standard">Your card is ready!</p>
      ) : null}
      <RevealActionButtons
        show={showActions && phase >= 2}
        primaryActionLabel={primaryActionLabel}
        onPrimaryAction={onPrimaryAction}
        onGenerateAnother={onGenerateAnother}
        onStartOver={onStartOver}
      />
    </div>
  );
}
