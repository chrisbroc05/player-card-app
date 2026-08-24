import React from "react";
import RarityStamp from "./RarityStamp";
import {
  ConfettiRain,
  ConvergeParticles,
  LetterReveal,
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
      { at: 400, index: 1 },
      { at: 2200, index: 2 },
      { at: 2800, index: 3 },
      { at: 4000, index: 4 },
      { at: 4800, index: 5 },
      { at: 7200, index: 6 },
    ],
    resetKey
  );

  return (
    <>
      <RarityStamp active={phase === 3} rarity={rarity} />
      <RevealScene
        className={`rre-scene--one-of-one${phase >= 5 ? " rre-scene--shake" : ""}`}
        backdrop={
          <>
            <div className="rre-bg rre-bg--one-of-one" aria-hidden />
            {phase >= 1 && phase < 6 ? <ConvergeParticles count={80} tone="mixed" /> : null}
            {phase >= 5 ? <ConfettiRain count={48} durationClass="rre-confetti--long" /> : null}
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
        {phase >= 1 && phase < 3 ? (
          <LetterReveal
            text="O N E    O F    O N E"
            className="rre-letter-title rre-letter-title--one-of-one"
            delayMs={100}
          />
        ) : null}

        {phase >= 3 ? (
          <div className="rre-card-stage rre-card-stage--visible">
            <RevealCardDisplay
              revealCard={revealCard}
              playerName={playerName}
              materialize={phase >= 3 && phase < 4}
              animateSignature={phase >= 5}
            />
          </div>
        ) : null}

        {phase >= 4 ? <RevealPullMessage rarity={rarity} /> : null}
      </RevealScene>
    </>
  );
}
