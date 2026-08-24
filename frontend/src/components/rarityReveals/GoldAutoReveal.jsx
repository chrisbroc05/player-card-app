import React, { useEffect, useMemo, useState } from "react";
import { ConvergeParticles, RevealActionButtons, RevealCardDisplay } from "./RevealShared";

export default function GoldAutoReveal({
  revealCard,
  playerName,
  showActions,
  primaryActionLabel,
  onPrimaryAction,
  onGenerateAnother,
  onStartOver,
  celebrationMessage = "",
}) {
  const particles = useMemo(() => true, []);
  const [phase, setPhase] = useState(0);
  const resetKey = `${revealCard?.card_id}-${revealCard?.image_url}`;

  useEffect(() => {
    setPhase(0);
    const t1 = window.setTimeout(() => setPhase(1), 2000);
    const t2 = window.setTimeout(() => setPhase(2), 3500);
    const t3 = window.setTimeout(() => setPhase(3), 4500);
    const t4 = window.setTimeout(() => setPhase(4), 6000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
    };
  }, [resetKey]);

  const showCard = phase >= 1;
  const showStamp = phase >= 2 && phase < 3;
  const showSettled = phase >= 4;

  return (
    <div className="rre-scene rre-scene--gold-auto" aria-live="polite">
      <div className="rre-bg rre-bg--gold" aria-hidden />

      {phase < 4 && particles ? <ConvergeParticles count={72} tone="gold" /> : null}

      {phase >= 0 && phase < 2 ? (
        <p className="rre-teaser rre-teaser--gold">Something rare is happening...</p>
      ) : null}

      {showCard ? (
        <div
          className={`rre-card-stage${phase >= 1 && phase < 4 ? " rre-card-stage--spin-in" : ""}${showSettled ? " rre-card-stage--settled" : ""}`}
        >
          <div className="rre-rays" aria-hidden />
          <RevealCardDisplay revealCard={revealCard} playerName={playerName} animateSignature={showSettled} />
        </div>
      ) : null}

      {showStamp ? (
        <>
          <div className="rre-flash rre-flash--gold" aria-hidden />
          <div className="rre-stamp rre-stamp--gold" aria-hidden>
            AUTO
          </div>
        </>
      ) : null}

      {showSettled ? (
        <div className="rre-settled-copy">
          <p className="rre-title">Gold Auto Pull!</p>
          <p className="rre-subtitle">This is your rarest card yet</p>
          {celebrationMessage ? <p className="rre-celebration">{celebrationMessage}</p> : null}
        </div>
      ) : null}

      <RevealActionButtons
        show={showActions && showSettled}
        primaryActionLabel={primaryActionLabel}
        onPrimaryAction={onPrimaryAction}
        onGenerateAnother={onGenerateAnother}
        onStartOver={onStartOver}
      />
    </div>
  );
}
