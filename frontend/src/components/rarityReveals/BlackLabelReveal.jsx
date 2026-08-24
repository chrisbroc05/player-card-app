import React from "react";
import RarityStamp from "./RarityStamp";
import {
  ConfettiRain,
  RevealActionButtons,
  RevealCardDisplay,
  RevealPullMessage,
  RevealScene,
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
}) {
  const rarity = revealCard?.rarity || "black_label";
  const resetKey = `${revealCard?.card_id}-${revealCard?.image_url}`;
  const phase = useRevealPhases(
    [
      { at: 0, index: 0 },
      { at: 2000, index: 1 },
      { at: 3200, index: 2 },
      { at: 5200, index: 3 },
      { at: 6400, index: 4 },
      { at: 7600, index: 5 },
      { at: 9000, index: 6 },
      { at: 11000, index: 7 },
    ],
    resetKey
  );

  return (
    <>
      <RarityStamp active={phase === 4} rarity={rarity} />
      <RevealScene
        className="rre-scene--black-label"
        backdrop={
          <>
            {phase >= 0 && phase < 2 ? (
              <div className={`rre-bg rre-bg--black-label${phase >= 1 ? " rre-bg--black-label-solid" : ""}`} aria-hidden />
            ) : null}
            {phase >= 2 && phase < 7 ? <div className="rre-spotlight" aria-hidden /> : null}
            {phase >= 5 && phase < 7 ? (
              <ConfettiRain count={100} durationClass="rre-confetti--shower" />
            ) : null}
          </>
        }
        actions={
          <RevealActionButtons
            show={showActions && phase >= 7}
            primaryActionLabel={primaryActionLabel}
            onPrimaryAction={onPrimaryAction}
            onGenerateAnother={onGenerateAnother}
            onStartOver={onStartOver}
          />
        }
      >
        {phase >= 0 && phase < 2 ? (
          <p className="rre-teaser rre-teaser--black-label">Something extraordinary is happening...</p>
        ) : null}

        {phase >= 3 ? (
          <div
            className={`rre-card-stage rre-card-stage--rise-short${phase >= 3 ? " rre-card-stage--visible" : ""}`}
          >
            <RevealCardDisplay
              revealCard={revealCard}
              playerName={playerName}
              floating={phase >= 6}
              animateSignature={phase >= 6}
            />
          </div>
        ) : null}

        {phase >= 6 ? <RevealPullMessage rarity={rarity} className="rre-settled-copy--slow" /> : null}
      </RevealScene>
    </>
  );
}
