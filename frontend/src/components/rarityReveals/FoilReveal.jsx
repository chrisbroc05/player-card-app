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

export default function FoilReveal({
  revealCard,
  playerName,
  showActions,
  primaryActionLabel,
  onPrimaryAction,
  onGenerateAnother,
  onStartOver,
}) {
  const rarity = revealCard?.rarity || "foil";
  const resetKey = `${revealCard?.card_id}-${revealCard?.image_url}`;
  const phase = useRevealPhases(
    [
      { at: 0, index: 0 },
      { at: 200, index: 1 },
      { at: 800, index: 2 },
      { at: 2000, index: 3 },
      { at: 2800, index: 4 },
      { at: 4200, index: 5 },
    ],
    resetKey
  );

  return (
    <>
      {phase === 1 ? <div className="rre-flash rre-flash--gold-soft" aria-hidden /> : null}
      <RarityStamp active={phase === 2} rarity={rarity} />
      <RevealScene
        className="rre-scene--foil"
        backdrop={phase === 2 ? <RadialParticles count={25} tone="gold" /> : null}
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
        <div className={`rre-card-stage rre-card-stage--bounce${phase >= 0 ? " rre-card-stage--visible" : ""}`}>
          <div className={`rre-card-frame${phase === 1 ? " rre-card-frame--foil-pulse" : ""}`}>
            <RevealCardDisplay revealCard={revealCard} playerName={playerName} />
            {phase === 1 ? <div className="foil-reveal-overlay" aria-hidden /> : null}
          </div>
        </div>
        {phase >= 4 ? <RevealPullMessage rarity={rarity} /> : null}
      </RevealScene>
    </>
  );
}
