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
      { at: 300, index: 1 },
      { at: 1500, index: 2 },
      { at: 2600, index: 3 },
    ],
    resetKey
  );

  return (
    <>
      <RarityStamp active={phase === 1} rarity={rarity} />
      <RevealScene
        className="rre-scene--foil"
        backdrop={phase >= 1 && phase < 2 ? <RadialParticles count={20} tone="gold" /> : null}
        actions={
          <RevealActionButtons
            show={showActions && phase >= 3}
            primaryActionLabel={primaryActionLabel}
            onPrimaryAction={onPrimaryAction}
            onGenerateAnother={onGenerateAnother}
            onStartOver={onStartOver}
          />
        }
      >
        <div className={`rre-card-stage rre-card-stage--bounce${phase >= 0 ? " rre-card-stage--visible" : ""}`}>
          <div className={`rre-card-frame${phase >= 1 && phase < 2 ? " rre-card-frame--foil-pulse" : ""}`}>
            <RevealCardDisplay revealCard={revealCard} playerName={playerName} />
            {phase >= 1 && phase < 2 ? <div className="foil-reveal-overlay" aria-hidden /> : null}
          </div>
        </div>
        {phase >= 2 ? <RevealPullMessage rarity={rarity} /> : null}
      </RevealScene>
    </>
  );
}
