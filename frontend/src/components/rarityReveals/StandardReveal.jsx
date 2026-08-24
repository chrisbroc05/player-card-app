import React from "react";
import RarityStamp from "./RarityStamp";
import {
  ConfettiRain,
  FloatUpParticles,
  RevealActionButtons,
  RevealCardDisplay,
  RevealScene,
  useRevealPhases,
} from "./RevealShared";

export default function StandardReveal({
  revealCard,
  playerName,
  showActions,
  primaryActionLabel,
  onPrimaryAction,
  onGenerateAnother,
  onStartOver,
}) {
  const rarity = revealCard?.rarity || "standard";
  const resetKey = `${revealCard?.card_id}-${revealCard?.image_url}`;
  const phase = useRevealPhases(
    [
      { at: 0, index: 0 },
      { at: 300, index: 1 },
      { at: 600, index: 2 },
      { at: 2100, index: 3 },
      { at: 3600, index: 4 },
      { at: 4200, index: 5 },
    ],
    resetKey
  );

  const showStamp = phase >= 2 && phase < 4;

  return (
    <>
      <RarityStamp active={showStamp} rarity={rarity} />
      <RevealScene
        className="rre-scene--standard"
        backdrop={
          <>
            {phase === 2 ? <FloatUpParticles count={15} /> : null}
            {phase === 3 ? <ConfettiRain count={24} /> : null}
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
          className={`rre-card-stage rre-card-stage--fade-in${phase >= 1 ? " rre-card-stage--visible" : ""}`}
        >
          <RevealCardDisplay revealCard={revealCard} playerName={playerName} />
        </div>
        {phase >= 4 ? (
          <p className="rre-message reveal-message rre-message--standard">Your card is ready!</p>
        ) : null}
      </RevealScene>
    </>
  );
}
