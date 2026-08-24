import React, { useEffect, useMemo, useState } from "react";
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
  const particles = useMemo(() => true, []);
  const [phase, setPhase] = useState(0);
  const resetKey = `${revealCard?.card_id}-${revealCard?.image_url}`;

  useEffect(() => {
    setPhase(0);
    const t1 = window.setTimeout(() => setPhase(1), 2000);
    const t2 = window.setTimeout(() => setPhase(2), 3200);
    const t3 = window.setTimeout(() => setPhase(3), 6000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [resetKey]);

  const showCard = phase >= 1;
  const showStamp = phase === 1;
  const showSettled = phase >= 2;

  return (
    <>
      <RarityStamp active={showStamp} rarity={rarity} />
      <RevealScene
        className="rre-scene--gold-auto"
        backdrop={
          <>
            <div className="rre-bg rre-bg--gold" aria-hidden />
            {phase < 3 && particles ? <ConvergeParticles count={72} tone="gold" /> : null}
          </>
        }
        actions={
          <RevealActionButtons
            show={showActions && showSettled}
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
            className={`rre-card-stage${phase >= 1 && phase < 3 ? " rre-card-stage--spin-in" : ""}${showSettled ? " rre-card-stage--settled" : ""}`}
          >
            <div className="rre-rays" aria-hidden />
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
