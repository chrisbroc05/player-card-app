import React from "react";
import RarityStamp from "./RarityStamp";
import {
  ConfettiRain,
  ConvergeParticles,
  RevealActionButtons,
  RevealCardDisplay,
  RevealPullMessage,
  RevealScene,
  useRevealPhases,
} from "./RevealShared";

export default function OneOfOneReveal({
  revealCard,
  playerName,
  showActions,
  primaryActionLabel,
  onPrimaryAction,
  onGenerateAnother,
  onStartOver,
}) {
  const rarity = revealCard?.rarity || "one_of_one";
  const resetKey = `${revealCard?.card_id}-${revealCard?.image_url}`;
  const phase = useRevealPhases(
    [
      { at: 0, index: 0 },
      { at: 300, index: 1 },
      { at: 1800, index: 2 },
      { at: 3300, index: 3 },
      { at: 4800, index: 4 },
      { at: 5600, index: 5 },
      { at: 8200, index: 6 },
    ],
    resetKey
  );

  return (
    <>
      <RarityStamp active={phase === 3} rarity={rarity} />
      <RevealScene
        className={`rre-scene--one-of-one${phase === 3 ? " rre-scene--shake" : ""}`}
        backdrop={
          <>
            {phase >= 1 && phase < 6 ? <div className="rre-bg rre-bg--one-of-one" aria-hidden /> : null}
            {phase === 4 ? <ConvergeParticles count={60} tone="mixed" /> : null}
            {phase >= 5 && phase < 6 ? <ConfettiRain count={48} durationClass="rre-confetti--long" /> : null}
          </>
        }
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
        {phase >= 2 ? (
          <div className="rre-card-stage rre-card-stage--visible">
            <RevealCardDisplay
              revealCard={revealCard}
              playerName={playerName}
              materialize={phase >= 2 && phase < 4}
              animateSignature={phase >= 5}
            />
          </div>
        ) : null}

        {phase >= 5 ? <RevealPullMessage rarity={rarity} /> : null}
      </RevealScene>
    </>
  );
}
