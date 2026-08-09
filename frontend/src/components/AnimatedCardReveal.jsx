import React, { useCallback, useMemo, useState } from "react";
import HighlightVideoPlayer from "./HighlightVideoPlayer";
import { CARD_VIDEO_DETAIL_WRAPPER } from "../utils/cardImageStyles";
import "../styles/animatedCardReveal.css";

const CONFETTI_COUNT = 45;

function buildConfettiPieces(tierColor, tierMuted) {
  const palette = [tierColor, tierMuted, "#ffffff", "#f0c030", "#c4b5fd"];
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => {
    const left = (i * 97) % 100;
    const delay = (i % 12) * 0.04;
    const drift = `${(i % 2 === 0 ? 1 : -1) * (8 + (i % 7) * 6)}px`;
    const color = palette[i % palette.length];
    return { id: i, left, delay, drift, color };
  });
}

/**
 * Premium cinematic reveal when an animated card finishes generating.
 */
export default function AnimatedCardReveal({
  videoUrl,
  playerName = "",
  tierConfig,
  theme = "",
  showPrimaryAction = false,
  primaryActionLabel = "Add to Collection",
  onPrimaryAction,
  secondaryAction = null,
}) {
  const [muted, setMuted] = useState(true);

  const toggleSound = useCallback(() => {
    setMuted((prev) => !prev);
  }, []);

  const confettiPieces = useMemo(
    () => buildConfettiPieces(tierConfig.color, tierConfig.colorMuted),
    [tierConfig.color, tierConfig.colorMuted]
  );

  const tier = tierConfig.key === "all_star" ? "allstar" : tierConfig.key;

  return (
    <div className="acr-scene" aria-live="polite">
      <div className="acr-bg" aria-hidden />
      <div className="acr-anticipation-glow" aria-hidden />

      <div className="acr-confetti" aria-hidden>
        {confettiPieces.map((piece) => (
          <span
            key={piece.id}
            className="acr-confetti-piece"
            style={{
              left: `${piece.left}%`,
              backgroundColor: piece.color,
              "--delay": `${piece.delay}s`,
              "--drift": piece.drift,
            }}
          />
        ))}
      </div>

      <div className="acr-stage">
        <div className="acr-card-wrap">
          <div className="acr-sound-burst" aria-hidden />
          <div className="acr-glow" aria-hidden />

          <div className="acr-card-frame">
            {videoUrl ? (
              <HighlightVideoPlayer
                videoSrc={videoUrl}
                videoKey="animated-reveal"
                theme={theme}
                tier={tier}
                tintOpacityScale={1}
                playing
                autoPlay
                muted={muted}
                wrapperClass={CARD_VIDEO_DETAIL_WRAPPER}
                ariaLabel={playerName ? `${playerName} animated card` : "Animated card"}
                showSoundToggle
                soundMuted={muted}
                onToggleSound={toggleSound}
                objectFit="cover"
                soundTogglePosition="right"
              />
            ) : null}
            <span className="acr-badge">ANIMATED</span>
          </div>
        </div>

        <div className="acr-copy">
          <h2 className="acr-headline">Your animated card is ready!</h2>
          {playerName ? <p className="acr-player-name">{playerName}</p> : null}
        </div>

        {showPrimaryAction ? (
          <div className="acr-actions">
            <button
              type="button"
              className="acr-btn acr-btn--primary"
              style={{ backgroundColor: tierConfig.color }}
              onClick={onPrimaryAction}
            >
              {primaryActionLabel}
            </button>
            {secondaryAction ? secondaryAction : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
