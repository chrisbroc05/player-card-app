import React, { useEffect, useState } from "react";
import CardImage from "../CardImage";
import { getRevealPullMessage, hasAutoSignature } from "../../utils/rarityStyles";

export function RevealCardDisplay({
  revealCard,
  playerName = "",
  animateSignature = false,
  className = "",
  floating = false,
  materialize = false,
}) {
  if (!revealCard) return null;
  const signature = animateSignature || hasAutoSignature(revealCard.rarity);
  return (
    <div
      className={`rre-card-shell${floating ? " rre-card-shell--float" : ""}${materialize ? " rre-card-shell--materialize" : ""} ${className}`.trim()}
    >
      <CardImage
        card={revealCard}
        alt={playerName || "Your card"}
        showInfoBanner
        showRarityBadge
        animateSignature={signature}
        variant="detail"
      />
    </div>
  );
}

export function RevealPullMessage({ rarity, className = "" }) {
  const title = getRevealPullMessage(rarity);
  if (!title) return null;
  return (
    <div className={`rre-settled-copy ${className}`.trim()}>
      <p className="rre-title">{title}</p>
    </div>
  );
}

export function RevealScene({ className = "", backdrop = null, children, actions = null }) {
  return (
    <div className={`rre-scene ${className}`.trim()} aria-live="polite">
      {backdrop}
      <div className="overlay-card-container">{children}</div>
      {actions}
    </div>
  );
}

export function RevealActionButtons({
  show,
  primaryActionLabel,
  onPrimaryAction,
  onGenerateAnother,
  onStartOver,
}) {
  if (!show) return null;
  return (
    <div className="overlay-actions rre-actions cce-reveal-actions">
      <button type="button" className="cce-reveal-btn cce-reveal-btn--primary" onClick={onPrimaryAction}>
        {primaryActionLabel || "Add to Collection"}
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
  );
}

export function useRevealPhases(phases, resetKey) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    setPhase(0);
    const timers = phases.map(({ at, index }) =>
      window.setTimeout(() => setPhase(index), at)
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return phase;
}

export function RadialParticles({ count = 24, className = "", tone = "gold" }) {
  const pieces = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 360;
    return { id: i, angle, delay: (i % 12) * 0.04 };
  });
  return (
    <div className={`rre-particles rre-particles--radial ${className}`.trim()} aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className={`rre-particle rre-particle--${tone} rre-particle--burst`}
          style={{ "--angle": `${p.angle}deg`, "--delay": `${p.delay}s` }}
        />
      ))}
    </div>
  );
}

export function ConvergeParticles({ count = 72, tone = "gold" }) {
  const pieces = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (i % 7) * 0.15;
    const dist = 55 + (i % 9) * 12;
    return {
      id: i,
      startX: `${Math.cos(angle) * dist}vw`,
      startY: `${Math.sin(angle) * dist}vh`,
      size: 3 + (i % 4),
      delay: (i % 24) * 0.025,
      particleTone: tone === "mixed" && i % 3 === 0 ? "red" : tone === "mixed" ? "gold" : tone,
    };
  });
  return (
    <div className="rre-particles rre-particles--converge" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className={`rre-particle rre-particle--${p.particleTone} rre-particle--converge`}
          style={{
            "--start-x": p.startX,
            "--start-y": p.startY,
            "--size": `${p.size}px`,
            "--delay": `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export function ConfettiRain({ count = 40, durationClass = "" }) {
  return (
    <div className={`rre-confetti ${durationClass}`.trim()} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="rre-confetti-piece" style={{ "--i": i, "--delay": `${(i % 20) * 0.08}s` }} />
      ))}
    </div>
  );
}

export function LetterReveal({ text, className = "", delayMs = 100 }) {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    setVisible(0);
    let i = 0;
    const iv = window.setInterval(() => {
      i += 1;
      setVisible(i);
      if (i >= text.length) window.clearInterval(iv);
    }, delayMs);
    return () => window.clearInterval(iv);
  }, [text, delayMs]);

  return (
    <p className={className} aria-live="polite">
      {text.split("").map((ch, idx) => (
        <span
          key={`${ch}-${idx}`}
          className="rre-letter"
          style={{ opacity: idx < visible ? 1 : 0, transition: "opacity 0.1s ease" }}
        >
          {ch}
        </span>
      ))}
    </p>
  );
}
