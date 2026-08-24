import React, { useEffect, useState } from "react";
import RarityStamp from "./RarityStamp";
import {
  ConvergeParticles,
  RevealActionButtons,
  RevealCardDisplay,
  RevealPullMessage,
  RevealScene,
} from "./RevealShared";

export default function GoldAutoReveal({
  revealCard,
  playerName,
  showActions,
  primaryActionLabel,
  onPrimaryAction,
  onGenerateAnother,
  onStartOver,
}) {
  const rarity = revealCard?.rarity || "gold_auto";
  const [phase, setPhase] = useState(0);
  const resetKey = `${revealCard?.card_id}-${revealCard?.image_url}`;

  useEffect(() => {
    setPhase(0);
    const timers = [
      window.setTimeout(() => setPhase(1), 2000),
      window.setTimeout(() => setPhase(2), 3500),
      window.setTimeout(() => setPhase(3), 5000),
      window.setTimeout(() => setPhase(4), 7200),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [resetKey]);

  const showCard = phase >= 1;
  const showStamp = phase === 2;
  const showSettled = phase >= 3;
  const showParticles = phase >= 1 && phase < 3;

  return (
    <>
      <RarityStamp active={showStamp} rarity={rarity} />
      <RevealScene
        className="rre-scene--gold-auto"
        backdrop={
          <>
            {phase >= 1 && phase < 4 ? <div className="rre-bg rre-bg--gold" aria-hidden /> : null}
            {showParticles ? <ConvergeParticles count={72} tone="gold" /> : null}
          </>
        }
        actions={
          <RevealActionButtons
            show={showActions && phase >= 4}
            primaryActionLabel={primaryActionLabel}
            onPrimaryAction={onPrimaryAction}
            onGenerateAnother={onGenerateAnother}
            onStartOver={onStartOver}
          />
        }
      >
        {phase >= 0 && phase < 1 ? (
          <p className="rre-teaser rre-teaser--gold">Something rare is happening...</p>
        ) : null}

        {showCard ? (
          <div
            className={`rre-card-stage${phase === 1 ? " rre-card-stage--spin-in" : ""}${showSettled ? " rre-card-stage--settled" : ""}`}
          >
            <RevealCardDisplay
              revealCard={revealCard}
              playerName={playerName}
              animateSignature={showSettled}
            />
          </div>
        ) : null}

        {showSettled ? <RevealPullMessage rarity={rarity} /> : null}
      </RevealScene>
    </>
  );
}
