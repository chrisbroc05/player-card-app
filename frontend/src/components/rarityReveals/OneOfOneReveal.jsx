import React from "react";
import {
  ConfettiRain,
  ConvergeParticles,
  LetterReveal,
  RevealActionButtons,
  RevealCardDisplay,
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
  celebrationMessage = "",
}) {
  const resetKey = `${revealCard?.card_id}-${revealCard?.image_url}`;
  const phase = useRevealPhases(
    [
      { at: 0, index: 0 },
      { at: 400, index: 1 },
      { at: 2200, index: 2 },
      { at: 2800, index: 3 },
      { at: 4300, index: 4 },
      { at: 4800, index: 5 },
      { at: 5200, index: 6 },
      { at: 7200, index: 7 },
    ],
    resetKey
  );

  return (
    <div className={`rre-scene rre-scene--one-of-one${phase >= 5 ? " rre-scene--shake" : ""}`} aria-live="polite">
      <div className="rre-bg rre-bg--one-of-one" aria-hidden />

      {phase >= 1 && phase < 6 ? <ConvergeParticles count={80} tone="mixed" /> : null}

      {phase >= 1 && phase < 3 ? (
        <LetterReveal text="O N E    O F    O N E" className="rre-letter-title rre-letter-title--one-of-one" delayMs={100} />
      ) : null}

      {phase >= 3 ? (
        <div className="rre-card-stage rre-card-stage--visible">
          <RevealCardDisplay
            revealCard={revealCard}
            playerName={playerName}
            materialize={phase >= 3 && phase < 5}
            animateSignature={phase >= 6}
          />
        </div>
      ) : null}

      {phase >= 4 && phase < 5 ? (
        <>
          <div className="rre-flash rre-flash--red" aria-hidden />
          <div className="rre-stamp rre-stamp--red" aria-hidden>
            1 OF 1
          </div>
        </>
      ) : null}

      {phase >= 5 ? (
        <div className="rre-settled-copy">
          <p className="rre-title rre-title--one-of-one">1 OF 1 PULL</p>
          <p className="rre-subtitle">This card will never be created again</p>
          {celebrationMessage ? <p className="rre-celebration">{celebrationMessage}</p> : null}
        </div>
      ) : null}

      {phase >= 5 ? <ConfettiRain count={48} durationClass="rre-confetti--long" /> : null}

      <RevealActionButtons
        show={showActions && phase >= 7}
        primaryActionLabel={primaryActionLabel}
        onPrimaryAction={onPrimaryAction}
        onGenerateAnother={onGenerateAnother}
        onStartOver={onStartOver}
      />
    </div>
  );
}
