import React, { useEffect, useMemo, useRef } from "react";
import CardImage from "./CardImage";
import {
  POST_REVEAL_DISPLAY_MS,
  useCardCreationTiming,
} from "../hooks/useCardCreationTiming";
import {
  AWAKENING_CYCLE_TEXT,
  AWAKENING_FLIP_TEXT,
  FORGE_PHASE_TEXT,
  REEL_PHASE_TEXT,
  normalizeExperienceTier,
  themeDisplayName,
} from "../utils/cardCreationExperience";
import "../styles/cardCreationExperience.css";

const TEXT_FADE_MS = 300;

function ExperienceText({ text, visible }) {
  return (
    <p
      className={`cce-text ${visible ? "cce-text--visible" : "cce-text--hidden"}`}
      aria-live="polite"
    >
      {text || "\u00a0"}
    </p>
  );
}

function useCyclingText(messages, intervalMs, enabled) {
  const [idx, setIdx] = React.useState(0);
  const [visible, setVisible] = React.useState(true);

  useEffect(() => {
    if (!enabled || messages.length <= 1) return undefined;
    const iv = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIdx((i) => (i + 1) % messages.length);
        setVisible(true);
      }, TEXT_FADE_MS);
    }, intervalMs);
    return () => window.clearInterval(iv);
  }, [enabled, messages, intervalMs]);

  useEffect(() => {
    setIdx(0);
    setVisible(true);
  }, [messages]);

  return { text: messages[idx] || "", visible };
}

function tierCssVars(tierConfig) {
  const hex = tierConfig.color.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return {
    "--cce-tier": tierConfig.color,
    "--cce-tier-muted": tierConfig.colorMuted,
    "--cce-tier-rgb": `${r}, ${g}, ${b}`,
    "--cce-tier-font": tierConfig.font,
  };
}

function ForgeExperience({ phaseIndex, themeLabel, tierConfig, playerName, teamName, cardImageUrl }) {
  const theme = themeDisplayName(themeLabel);
  const phaseTexts = FORGE_PHASE_TEXT(theme, tierConfig.label);

  const staticText =
    phaseIndex === 0
      ? phaseTexts[0]
      : phaseIndex === 1
        ? phaseTexts[1]
        : phaseIndex === 3
          ? phaseTexts[5]
          : "";

  const cycleEnabled = phaseIndex === 2;
  const cycleMessages = useMemo(
    () => [phaseTexts[2], phaseTexts[3], phaseTexts[4]],
    [phaseTexts]
  );
  const cycled = useCyclingText(cycleMessages, 2000, cycleEnabled);
  const displayText = cycleEnabled ? cycled.text : staticText;
  const textVisible = cycleEnabled ? cycled.visible : true;

  return (
    <>
      <div className="cce-stage">
        {phaseIndex === 0 ? (
          <>
            <div className="cce-forge-heat" aria-hidden />
            <div className="cce-forge-spark" aria-hidden />
          </>
        ) : null}

        {phaseIndex >= 1 ? (
          <div className="cce-card-frame">
            {phaseIndex === 1 ? (
              <svg className="cce-card-frame__svg" viewBox="0 0 200 280" aria-hidden>
                <rect
                  className="cce-card-frame__rect cce-card-frame__rect--draw"
                  x="4"
                  y="4"
                  width="192"
                  height="272"
                />
              </svg>
            ) : null}
            <div
              className={`cce-card-frame__glow ${phaseIndex === 1 ? "cce-card-frame__glow--pulse" : ""}`}
              aria-hidden
            />
            <div className="cce-card-frame__inner">
              {phaseIndex >= 2 ? (
                <>
                  <div
                    className={`cce-card-placeholder ${phaseIndex >= 2 ? "cce-card-placeholder--sharp" : ""}`}
                    style={
                      cardImageUrl
                        ? {
                            backgroundImage: `url(${cardImageUrl})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : undefined
                    }
                    aria-hidden
                  />
                  {phaseIndex === 2 ? <div className="cce-scan-line" aria-hidden /> : null}
                  {phaseIndex >= 2 ? (
                    <>
                      <span className="cce-tier-edge cce-tier-edge--top" aria-hidden />
                      <span className="cce-tier-edge cce-tier-edge--right" aria-hidden />
                      <span className="cce-tier-edge cce-tier-edge--bottom" aria-hidden />
                      <span className="cce-tier-edge cce-tier-edge--left" aria-hidden />
                    </>
                  ) : null}
                </>
              ) : null}

              {phaseIndex >= 3 ? (
                <div className="cce-preview-banner cce-preview-banner--snap">
                  <p className="cce-preview-banner__name">{playerName || "Your Player"}</p>
                  {teamName ? <p className="cce-preview-banner__team">{teamName}</p> : null}
                  <span className="cce-preview-banner__pill">{tierConfig.pill}</span>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      <ExperienceText text={displayText} visible={textVisible} />
    </>
  );
}

function ReelCountdown({ num }) {
  return (
    <div className="cce-reel-countdown" key={num}>
      <div className="cce-reel-countdown__ring" aria-hidden />
      <span className="cce-reel-countdown__num">{num}</span>
    </div>
  );
}

function ReelExperience({ phaseIndex, playerName, elapsedMs }) {
  const staticText = REEL_PHASE_TEXT[phaseIndex] || REEL_PHASE_TEXT[1];
  const countdownNum = elapsedMs < 500 ? 3 : elapsedMs < 1000 ? 2 : 1;

  return (
    <>
      <div className="cce-reel-grain" aria-hidden />
      <div className="cce-reel-badge">HIGHLIGHT</div>
      <div className="cce-stage">
        {phaseIndex === 0 ? (
          <>
            <ReelCountdown num={countdownNum} />
            <div className="cce-reel-scratch" style={{ top: "20%" }} aria-hidden />
            <div className="cce-reel-scratch" style={{ top: "65%", animationDelay: "0.4s" }} aria-hidden />
          </>
        ) : null}

        {phaseIndex === 1 ? (
          <div className="cce-reel-strip-wrap">
            <div className="cce-reel-strip">
              {Array.from({ length: 24 }, (_, i) => (
                <div key={i} className="cce-reel-frame">
                  <div className="cce-reel-frame__motion" style={{ animationDelay: `${(i % 6) * 0.08}s` }} />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {phaseIndex >= 2 ? (
          <div className="cce-card-frame cce-reel-zoom">
            <div className="cce-card-frame__inner">
              {phaseIndex === 2 ? (
                <>
                  <div className="cce-reel-static" aria-hidden />
                  <div className="cce-reel-static cce-reel-static--clear" aria-hidden />
                  <div className="cce-reel-tint" aria-hidden />
                </>
              ) : null}
              {phaseIndex >= 3 ? (
                <div className="cce-preview-banner cce-preview-banner--snap">
                  <p className="cce-preview-banner__name">{playerName || "Your Highlight"}</p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {phaseIndex >= 3 ? <div className="cce-reel-spotlight" aria-hidden /> : null}
      </div>
      {phaseIndex > 0 ? <ExperienceText text={staticText} visible /> : null}
    </>
  );
}

function AwakeningExperience({ phaseIndex, tierConfig }) {
  const cycleEnabled = phaseIndex === 2;
  const cycled = useCyclingText(AWAKENING_CYCLE_TEXT.slice(1), 2000, cycleEnabled);

  const staticText =
    phaseIndex === 0
      ? ""
      : phaseIndex === 1
        ? AWAKENING_CYCLE_TEXT[0]
        : phaseIndex === 2
          ? cycled.text
          : phaseIndex === 3
            ? ""
            : AWAKENING_FLIP_TEXT;

  const textVisible = phaseIndex === 2 ? cycled.visible : true;

  return (
    <>
      {phaseIndex >= 2 ? (
        <div className="cce-energy-bar-wrap" aria-hidden>
          <div className="cce-energy-bar" />
        </div>
      ) : null}

      <div className="cce-stage">
        {phaseIndex === 0 ? <div className="cce-heartbeat-ring" aria-hidden /> : null}

        {phaseIndex >= 1 && phaseIndex <= 3 ? (
          <div style={{ position: "relative" }}>
            {Array.from({ length: 8 }, (_, i) => (
              <span
                key={i}
                className="cce-lightning"
                style={{
                  "--i": i,
                  top: `${20 + (i % 4) * 18}%`,
                  left: `${10 + (i % 3) * 35}%`,
                }}
                aria-hidden
              />
            ))}
            <div
              className={`cce-pack ${phaseIndex === 1 ? "cce-pack--drop" : ""} ${phaseIndex === 2 ? "cce-pack--shake" : ""} ${phaseIndex === 3 ? "cce-pack--cracked" : ""}`}
            >
              <span className="cce-pack__brand">Prospect Legends</span>
              <span className="cce-pack__tier">{tierConfig.label}</span>
            </div>
          </div>
        ) : null}

        {phaseIndex >= 3 ? (
          <div className={`cce-flip-scene ${phaseIndex >= 4 ? "cce-card-float" : ""}`}>
            <div className={`cce-flip-inner ${phaseIndex >= 4 ? "cce-flip-inner--flip" : ""}`}>
              <div className="cce-flip-face">
                <div className="cce-card-back">
                  <span className="cce-card-back__logo">Prospect Legends</span>
                </div>
              </div>
              <div className="cce-flip-face cce-flip-face--front">
                <div className="cce-card-frame__inner" style={{ position: "relative", height: "100%" }}>
                  <div
                    className="cce-card-placeholder"
                    style={{ filter: "blur(0)", animation: "none", opacity: 0.35 }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {phaseIndex > 0 ? <ExperienceText text={staticText} visible={textVisible} /> : null}
    </>
  );
}

function RevealSection({
  cardType,
  revealCard,
  videoUrl,
  playerName,
  revealVariant,
  showPrimaryAction,
  primaryActionLabel,
  onPrimaryAction,
  secondaryAction,
  revealTitle,
}) {
  const isHighlight = cardType === "highlight";
  const isAnimated = cardType === "animated";

  const wrapClass =
    revealVariant === "rise"
      ? "cce-reveal-card-wrap cce-reveal-card-wrap--rise"
      : "cce-reveal-card-wrap cce-reveal-card-wrap--bounce";

  return (
    <>
      <div className={`cce-reveal-flash ${isHighlight ? "cce-reveal-flash--hit" : ""}`} aria-hidden />
      <div className="cce-reveal-rays" aria-hidden />

      <div className="cce-particles" aria-hidden>
        {Array.from({ length: 24 }, (_, i) => (
          <span key={i} className="cce-particle" style={{ "--i": i }} />
        ))}
      </div>

      {cardType === "standard" ? (
        <div className="cce-confetti" aria-hidden>
          {Array.from({ length: 28 }, (_, i) => (
            <span key={i} className="cce-confetti-piece" style={{ "--i": i }} />
          ))}
        </div>
      ) : null}

      {isAnimated ? (
        <div className="cce-particles" aria-hidden>
          {Array.from({ length: 10 }, (_, i) => (
            <span
              key={`sp-${i}`}
              className="cce-sparkle"
              style={{
                "--i": i,
                top: `${15 + (i % 5) * 16}%`,
                left: `${8 + (i % 4) * 24}%`,
              }}
            />
          ))}
        </div>
      ) : null}

      <div className={wrapClass}>
        {videoUrl ? (
          <video
            src={videoUrl}
            className="cce-reveal-video"
            autoPlay
            muted
            loop
            playsInline
            aria-label={playerName || "Your card video"}
          />
        ) : revealCard ? (
          <CardImage card={revealCard} alt={playerName || "Your generated card"} showInfoBanner />
        ) : null}
      </div>

      <div className="cce-reveal-copy">
        <p className="cce-reveal-title">
          {revealTitle ||
            (isAnimated
              ? AWAKENING_FLIP_TEXT
              : isHighlight
                ? "Lights. Camera. Card."
                : "Your card is ready!")}
        </p>
        {isHighlight ? <span className="cce-reveal-badge">HIGHLIGHT</span> : null}
        {isAnimated ? <span className="cce-reveal-badge cce-reveal-badge--animated">ANIMATED</span> : null}
      </div>

      {showPrimaryAction ? (
        <div className="cce-reveal-actions">
          <button type="button" className="cce-reveal-btn cce-reveal-btn--primary" onClick={onPrimaryAction}>
            {primaryActionLabel || "Add to Collection"}
          </button>
          {secondaryAction}
        </div>
      ) : null}
    </>
  );
}

/**
 * Premium cinematic card creation + reveal experience.
 * CSS/vanilla JS only. Minimum 15s before reveal; loops final phase if API is slow.
 */
export default function CardCreationExperience({
  active = true,
  cardType = "standard",
  tier = "rookie",
  theme = "",
  playerName = "",
  teamName = "",
  generationComplete = false,
  cardImageUrl = "",
  card = null,
  videoUrl = "",
  onRevealComplete,
  showPrimaryAction = false,
  primaryActionLabel = "Add to Collection",
  onPrimaryAction,
  secondaryAction = null,
  revealTitle = "",
  fullscreen = false,
  hint = "This usually takes 30–60 seconds. Please keep this page open.",
}) {
  const tierConfig = normalizeExperienceTier(tier);
  const cssVars = tierCssVars(tierConfig);
  const completedRef = useRef(false);

  const { mode, phaseIndex, elapsedMs } = useCardCreationTiming({
    active,
    cardType,
    generationComplete,
  });

  const revealCard = useMemo(() => {
    if (card) return card;
    if (!cardImageUrl) return null;
    return {
      image_url: cardImageUrl,
      tier: tierConfig.key,
      player_name: playerName || "Your Card",
      team_name: teamName,
    };
  }, [card, cardImageUrl, tierConfig.key, playerName, teamName]);

  useEffect(() => {
    if (!active) {
      completedRef.current = false;
      return undefined;
    }
    if (mode !== "landed" || completedRef.current) return undefined;
    if (showPrimaryAction) return undefined;

    completedRef.current = true;
    const timer = window.setTimeout(() => {
      onRevealComplete?.();
    }, POST_REVEAL_DISPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [active, mode, onRevealComplete, showPrimaryAction]);

  if (!active) return null;

  const isReveal = mode === "reveal" || mode === "landed";
  const revealVariant = cardType === "highlight" ? "rise" : "bounce";

  return (
    <div
      className={`cce-scene ${fullscreen ? "cce-scene--fullscreen" : ""} ${isReveal ? "cce-scene--reveal" : ""}`}
      style={cssVars}
      aria-live="polite"
      aria-busy={!generationComplete}
    >
      <div className="cce-bg-gradient" aria-hidden />
      <div className="cce-vignette" aria-hidden />

      {!isReveal ? (
        <>
          {cardType === "standard" ? (
            <ForgeExperience
              phaseIndex={phaseIndex}
              themeLabel={theme}
              tierConfig={tierConfig}
              playerName={playerName}
              teamName={teamName}
              cardImageUrl={cardImageUrl}
            />
          ) : null}
          {cardType === "highlight" ? (
            <ReelExperience phaseIndex={phaseIndex} playerName={playerName} elapsedMs={elapsedMs} />
          ) : null}
          {cardType === "animated" ? (
            <AwakeningExperience phaseIndex={phaseIndex} tierConfig={tierConfig} />
          ) : null}
          {hint ? <p className="cce-hint">{hint}</p> : null}
        </>
      ) : (
        <RevealSection
          cardType={cardType}
          revealCard={revealCard}
          videoUrl={videoUrl}
          playerName={playerName}
          revealVariant={revealVariant}
          showPrimaryAction={showPrimaryAction && mode === "landed"}
          primaryActionLabel={primaryActionLabel}
          onPrimaryAction={() => {
            onPrimaryAction?.();
            onRevealComplete?.();
          }}
          secondaryAction={secondaryAction}
          revealTitle={revealTitle}
        />
      )}
    </div>
  );
}
