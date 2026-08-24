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
      { at: 120, index: 1 },
      { at: 400, index: 2 },
      { at: 1000, index: 3 },
      { at: 2200, index: 4 },
      { at: 4200, index: 5 },
    ],
    resetKey
  );

  return (
    <>
      <RarityStamp active={phase === 3} rarity={rarity} />
      <RevealScene
        className="rre-scene--refractor"
        backdrop={
          <>
            {phase >= 1 ? <div className="rre-flash rre-flash--silver" aria-hidden /> : null}
            {phase >= 2 && phase < 4 ? <RadialParticles count={30} tone="silver" /> : null}
          </>
        }
        actions={
          <RevealActionButtons
            show={showActions && phase >= 5}
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
          <div className={`rre-card-frame${phase >= 2 && phase < 4 ? " rre-card-frame--refractor-cycle" : ""}`}>
            <RevealCardDisplay revealCard={revealCard} playerName={playerName} />
            {phase >= 2 && phase < 4 ? <div className="rre-rainbow-ray" aria-hidden /> : null}
          </div>
        </div>
        {phase >= 4 ? <RevealPullMessage rarity={rarity} /> : null}
      </RevealScene>
    </>
  );
}
