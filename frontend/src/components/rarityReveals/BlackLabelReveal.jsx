import React from "react";
import {
  ConvergeParticles,
  LetterReveal,
  RevealActionButtons,
  RevealCardDisplay,
  useRevealPhases,
} from "./RevealShared";

export default function BlackLabelReveal({
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
      { at: 2000, index: 1 },
      { at: 3200, index: 2 },
      { at: 5200, index: 3 },
      { at: 7200, index: 4 },
      { at: 7800, index: 5 },
      { at: 9000, index: 6 },
    ],
    resetKey
  );

  return (
    <div className="rre-scene rre-scene--black-label" aria-live="polite">
      <div className={`rre-bg rre-bg--black-label${phase >= 1 ? " rre-bg--black-label-solid" : ""}`} aria-hidden />

      {phase >= 0 && phase < 2 ? (
        <p className="rre-teaser rre-teaser--black-label">Loading something extraordinary...</p>
      ) : null}

      {phase >= 1 ? <div className="rre-spotlight" aria-hidden /> : null}

      {phase >= 2 && phase < 4 ? (
        <p className="rre-legend-text">A legend has been born</p>
      ) : null}

      {phase >= 3 ? (
        <div className={`rre-card-stage rre-card-stage--rise${phase >= 3 ? " rre-card-stage--visible" : ""}`}>
          <RevealCardDisplay
            revealCard={revealCard}
            playerName={playerName}
            floating={phase >= 5}
            animateSignature={phase >= 5}
          />
        </div>
      ) : null}

      {phase >= 4 && phase < 6 ? <ConvergeParticles count={100} tone="gold" /> : null}

      {phase >= 5 ? (
        <LetterReveal text="BLACK LABEL" className="rre-letter-title rre-letter-title--black-label" delayMs={80} />
      ) : null}

      {phase >= 5 ? (
        <div className="rre-settled-copy rre-settled-copy--slow">
          <p className="rre-title rre-title--black-label">BLACK LABEL</p>
          <p className="rre-subtitle">The rarest card in existence</p>
          {celebrationMessage ? <p className="rre-celebration">{celebrationMessage}</p> : null}
        </div>
      ) : null}

      <RevealActionButtons
        show={showActions && phase >= 6}
        primaryActionLabel={primaryActionLabel}
        onPrimaryAction={onPrimaryAction}
        onGenerateAnother={onGenerateAnother}
        onStartOver={onStartOver}
      />
    </div>
  );
}
