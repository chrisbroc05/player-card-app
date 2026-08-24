import React, { useEffect, useMemo, useState } from "react";
import CardImage from "./CardImage";
import { RARITY_KEYS, normalizeRarityKey } from "../utils/rarityStyles";
import "../styles/premiumRarityReveal.css";

const PARTICLE_COUNT = 72;

function buildConvergeParticles(variant) {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + (i % 7) * 0.15;
    const dist = 55 + (i % 9) * 12;
    const startX = `${Math.cos(angle) * dist}vw`;
    const startY = `${Math.sin(angle) * dist}vh`;
    const isRed = variant === "one-of-one" && i % 3 === 0;
    const isDark = variant === "black-label" && i % 2 === 0;
    return {
      id: i,
      startX,
      startY,
      size: 3 + (i % 4),
      delay: (i % 24) * 0.025,
      tone: isRed ? "red" : isDark ? "dark" : "gold",
    };
  });
}

function variantMeta(rarityKey) {
  switch (rarityKey) {
    case RARITY_KEYS.ONE_OF_ONE:
      return {
        variant: "one-of-one",
        stamp: "1 OF 1",
        teaser: "Something incredible is happening...",
        title: "YOU PULLED A 1 OF 1!",
        subtitle: "This card will never be created again",
      };
    case RARITY_KEYS.BLACK_LABEL:
      return {
        variant: "black-label",
        stamp: "BLACK LABEL",
        teaser: "A legend is being forged...",
        title: "BLACK LABEL — THE RAREST PULL",
        subtitle: "A legend has been born",
      };
    case RARITY_KEYS.GOLD_AUTO:
    default:
      return {
        variant: "gold-auto",
        stamp: "AUTO",
        teaser: "Something rare is happening...",
        title: "Gold Auto Pull!",
        subtitle: "This is your rarest card yet",
      };
  }
}

export default function PremiumRarityReveal({
  rarity = "gold_auto",
  revealCard,
  playerName = "",
  showActions = false,
  primaryActionLabel = "Add to Collection",
  onPrimaryAction,
  onGenerateAnother,
  onStartOver,
  celebrationMessage = "",
}) {
  const rarityKey = normalizeRarityKey(rarity);
  const meta = variantMeta(rarityKey);
  const particles = useMemo(() => buildConvergeParticles(meta.variant), [meta.variant]);
  const [phase, setPhase] = useState(0);

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
  }, [rarityKey, revealCard?.card_id, revealCard?.image_url]);

  const showCard = phase >= 1;
  const showStamp = phase >= 2 && phase < 3;
  const showSettled = phase >= 4;

  return (
    <div className={`prr-scene prr-scene--${meta.variant}`} aria-live="polite">
      <div className="prr-bg" aria-hidden />

      {phase < 4 ? (
        <div className="prr-particles" aria-hidden>
          {particles.map((p) => (
            <span
              key={p.id}
              className={`prr-particle prr-particle--${p.tone}`}
              style={{
                "--start-x": p.startX,
                "--start-y": p.startY,
                "--size": `${p.size}px`,
                "--delay": `${p.delay}s`,
              }}
            />
          ))}
        </div>
      ) : null}

      {phase >= 0 && phase < 2 ? (
        <p className="prr-teaser">{meta.teaser}</p>
      ) : null}

      {showCard ? (
        <div className={`prr-card-stage${phase >= 1 && phase < 4 ? " prr-card-stage--spin-in" : ""}${showSettled ? " prr-card-stage--settled" : ""}`}>
          <div className="prr-rays" aria-hidden />
          <div className="prr-card-shell">
            {revealCard ? (
              <CardImage
                card={revealCard}
                alt={playerName || "Your card"}
                showInfoBanner
                showRarityBadge
                animateSignature={showSettled}
                variant="detail"
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {showStamp ? (
        <>
          <div className="prr-flash" aria-hidden />
          <div className="prr-stamp" aria-hidden>
            {meta.stamp}
          </div>
        </>
      ) : null}

      {showSettled ? (
        <div className="prr-settled-copy">
          <p className="prr-title">{meta.title}</p>
          {meta.subtitle ? <p className="prr-subtitle">{meta.subtitle}</p> : null}
          {celebrationMessage ? <p className="prr-celebration">{celebrationMessage}</p> : null}
        </div>
      ) : null}

      {showActions && showSettled ? (
        <div className="prr-actions">
          <button type="button" className="cce-reveal-btn cce-reveal-btn--primary" onClick={onPrimaryAction}>
            {primaryActionLabel}
          </button>
          {onGenerateAnother ? (
            <button type="button" className="cce-reveal-btn cce-reveal-btn--secondary" onClick={onGenerateAnother}>
              Generate Another Preview
            </button>
          ) : null}
          {onStartOver ? (
            <button type="button" className="cce-reveal-btn cce-reveal-btn--tertiary" onClick={onStartOver}>
              Start Over
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
