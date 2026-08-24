import React from "react";
import RarityStamp from "./RarityStamp";
import {
  ConvergeParticles,
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
      { at: 7800, index: 5 },
      { at: 9000, index: 6 },
    ],
    resetKey
  );

  return (
    <>
      <RarityStamp active={phase === 3} rarity={rarity} />
      <RevealScene
        className="rre-scene--black-label"
        backdrop={
          <>
            <div className={`rre-bg rre-bg--black-label${phase >= 1 ? " rre-bg--black-label-solid" : ""}`} aria-hidden />
            {phase >= 1 ? <div className="rre-spotlight" aria-hidden /> : null}
            {phase >= 4 && phase < 6 ? <ConvergeParticles count={100} tone="gold" /> : null}
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
        {phase >= 0 && phase < 2 ? (
          <p className="rre-teaser rre-teaser--black-label">Loading something extraordinary...</p>
        ) : null}

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

        {phase >= 4 ? <RevealPullMessage rarity={rarity} className="rre-settled-copy--slow" /> : null}
      </RevealScene>
    </>
  );
}
