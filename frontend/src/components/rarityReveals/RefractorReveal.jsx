import React from "react";
import RarityStamp from "./RarityStamp";
import {
  RadialParticles,
  RevealActionButtons,
  RevealCardDisplay,
  RevealPullMessage,
  RevealScene,
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
  const rarity = revealCard?.rarity || "refractor";
  const resetKey = `${revealCard?.card_id}-${revealCard?.image_url}`;
  const phase = useRevealPhases(
    [
      { at: 0, index: 0 },
      { at: 100, index: 1 },
      { at: 400, index: 2 },
      { at: 1100, index: 3 },
      { at: 2400, index: 4 },
      { at: 3200, index: 5 },
      { at: 5200, index: 6 },
    ],
    resetKey
  );

  return (
    <>
      {phase === 1 ? <div className="rre-flash rre-flash--blue" aria-hidden /> : null}
      <RarityStamp active={phase === 3} rarity={rarity} />
      <RevealScene
        className="rre-scene--refractor"
        backdrop={phase === 3 ? <RadialParticles count={35} tone="silver" /> : null}
        actions={
          <RevealActionButtons
            show={showActions && phase >= 6}
            primaryActionLabel={primaryActionLabel}
            onPrimaryAction={onPrimaryAction}
            onGenerateAnother={onGenerateAnother}
            onStartOver={onStartOver}
          />
        }
      >
        <div
          className={`rre-card-stage rre-card-stage--refractor-slide${phase >= 2 ? " rre-card-stage--visible" : ""}`}
        >
          <div className={`rre-card-frame${phase === 4 ? " rre-card-frame--refractor-cycle" : ""}`}>
            <RevealCardDisplay revealCard={revealCard} playerName={playerName} />
            {phase === 4 ? <div className="rre-rainbow-ray" aria-hidden /> : null}
          </div>
        </div>
        {phase >= 5 ? <RevealPullMessage rarity={rarity} /> : null}
      </RevealScene>
    </>
  );
}
