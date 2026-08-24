import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AnimatedCardReveal from "./AnimatedCardReveal";
import RarityRevealExperience from "./RarityRevealExperience";
import CardImage from "./CardImage";
import { toApiUrl } from "../config/api";
import {
  MIN_DURATION_MS,
  useCardCreationTiming,
} from "../hooks/useCardCreationTiming";
import {
  HIGHLIGHT_CREATION_POLL_INTERVAL_MS,
  useHighlightStatusPolling,
} from "../hooks/useHighlightStatusPolling";
import { buildAnimationCyclingMessages } from "../utils/animationWaitMessaging";
import {
  AWAKENING_CYCLE_TEXT,
  AWAKENING_FLIP_TEXT,
  FORGE_PHASE_TEXT,
  REEL_PHASE_TEXT,
  normalizeExperienceTier,
  themeDisplayName,
} from "../utils/cardCreationExperience";
import { forgeLoadingMessage, getRevealConfig, getRevealCelebrationMessage } from "../utils/rarityStyles";
import "../styles/cardCreationExperience.css";

const TEXT_FADE_MS = 500;
const PHASE_CROSSFADE_MS = 500;

const LOADING_FUN_FACTS = [
  "Every card has a chance to pull a rare Foil or Refractor",
  "Gold Autos are pulled by only 1 in 50 players",
  "A 1 of 1 has never been pulled twice for the same player and tier",
  "Your card rarity is determined the moment generation begins",
  "Black Label cards have a 0.1% pull rate — rarer than a hole in one",
];

function LoadingFunFacts() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((prev) => (prev + 1) % LOADING_FUN_FACTS.length);
        setVisible(true);
      }, 280);
    }, 3000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <p className={`cce-fun-fact${visible ? " cce-fun-fact--visible" : ""}`} aria-live="polite">
      {LOADING_FUN_FACTS[index]}
    </p>
  );
}

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

function usePhaseText(phaseIndex, getTextForPhase, cycleMessages = [], cyclePhase = -1) {
  const [visible, setVisible] = React.useState(true);
  const [displayPhase, setDisplayPhase] = React.useState(phaseIndex);
  const prevPhaseRef = useRef(phaseIndex);

  useEffect(() => {
    if (phaseIndex === prevPhaseRef.current) return undefined;
    setVisible(false);
    const timer = window.setTimeout(() => {
      prevPhaseRef.current = phaseIndex;
      setDisplayPhase(phaseIndex);
      setVisible(true);
    }, PHASE_CROSSFADE_MS);
    return () => window.clearTimeout(timer);
  }, [phaseIndex]);

  const cycleEnabled = displayPhase === cyclePhase;
  const cycled = useCyclingText(cycleMessages, 2000, cycleEnabled);
  const staticText = getTextForPhase(displayPhase);

  if (cycleEnabled) {
    return { text: cycled.text, visible: visible && cycled.visible };
  }
  return { text: staticText, visible };
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

function ForgeExperience({
  phaseIndex,
  themeLabel,
  tierConfig,
  playerName,
  teamName,
  cardImageUrl,
  rarity,
  elapsedMs,
  generationComplete,
  templateName = "",
}) {
  const theme = themeDisplayName(themeLabel);
  const phaseTexts = FORGE_PHASE_TEXT(theme, tierConfig.label);
  const rareLoadingHint = forgeLoadingMessage(rarity, elapsedMs, generationComplete);
  const variantLabel = templateName || theme;
  const tierThemeLine = variantLabel ? `${tierConfig.label} • ${variantLabel}` : tierConfig.label;

  const getTextForPhase = (phase) => {
    if (rareLoadingHint) return rareLoadingHint;
    if (phase === 0) return phaseTexts[0];
    if (phase === 1) return phaseTexts[1];
    if (phase === 3) return phaseTexts[5];
    return "";
  };

  const { text: displayText, visible: textVisible } = usePhaseText(
    phaseIndex,
    getTextForPhase,
    [phaseTexts[2], phaseTexts[3], phaseTexts[4]],
    2
  );

  const sparkLayerClass =
    phaseIndex === 0 ? "cce-forge-spark-layer--active" : phaseIndex === 1 ? "cce-forge-spark-layer--exit" : "";
  const frameLayerClass = phaseIndex >= 1 ? "cce-forge-frame-layer--visible" : "";
  const scanLayerClass = phaseIndex >= 2 ? "cce-forge-inner-layer--visible" : "";
  const bannerLayerClass = phaseIndex >= 3 ? "cce-forge-inner-layer--visible" : "";

  return (
    <>
      <div className="cce-forge-intro" aria-hidden />
      <div className="cce-stage cce-stage--forge">
        <div className={`cce-forge-spark-layer ${sparkLayerClass}`}>
          <div className="cce-forge-heat" aria-hidden />
          <div className="cce-forge-spark" aria-hidden />
        </div>

        <div className={`cce-forge-frame-layer ${frameLayerClass}`}>
          <div className="cce-card-frame">
            <svg className="cce-card-frame__svg" viewBox="0 0 200 280" aria-hidden>
              <rect
                className={`cce-card-frame__rect ${phaseIndex >= 1 ? "cce-card-frame__rect--draw" : ""}`}
                x="4"
                y="4"
                width="192"
                height="272"
              />
            </svg>
            <div
              className={`cce-card-frame__glow ${phaseIndex === 1 ? "cce-card-frame__glow--pulse" : ""}`}
              aria-hidden
            />
            <div className="cce-card-frame__inner">
              <div className={`cce-forge-inner-layer cce-forge-scan-layer ${scanLayerClass}`}>
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
                <span className="cce-tier-edge cce-tier-edge--top" aria-hidden />
                <span className="cce-tier-edge cce-tier-edge--right" aria-hidden />
                <span className="cce-tier-edge cce-tier-edge--bottom" aria-hidden />
                <span className="cce-tier-edge cce-tier-edge--left" aria-hidden />
              </div>

              <div className={`cce-forge-inner-layer cce-forge-banner-layer ${bannerLayerClass}`}>
                <div className={`cce-preview-banner ${phaseIndex >= 3 ? "cce-preview-banner--snap" : ""}`}>
                  <p className="cce-preview-banner__name">{playerName || "Your Player"}</p>
                  {teamName ? <p className="cce-preview-banner__team">{teamName}</p> : null}
                  <span className="cce-preview-banner__pill">{tierConfig.pill}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ExperienceText text={displayText} visible={textVisible} />
      <div className="cce-loading-meta">
        <p className="cce-loading-tier-theme">{tierThemeLine}</p>
        <LoadingFunFacts />
      </div>
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

function ReelExperience({ phaseIndex, playerName, elapsedMs, waitingForVideo = false }) {
  const staticText = waitingForVideo
    ? "Almost ready..."
    : REEL_PHASE_TEXT[phaseIndex] || REEL_PHASE_TEXT[1];
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

function AwakeningExperience({ phaseIndex, tierConfig, waitingForGeneration = false, motionName = "" }) {
  const cycleEnabled = phaseIndex === 2 && !waitingForGeneration;
  const cycled = useCyclingText(AWAKENING_CYCLE_TEXT.slice(1), 2000, cycleEnabled);

  const waitMessages = React.useMemo(
    () => buildAnimationCyclingMessages(motionName),
    [motionName]
  );
  const waitCycled = useCyclingText(waitMessages, 3000, waitingForGeneration);

  const staticText = waitingForGeneration
    ? waitCycled.text
    : phaseIndex === 0
      ? ""
      : phaseIndex === 1
        ? AWAKENING_CYCLE_TEXT[0]
        : phaseIndex === 2
          ? cycled.text
          : phaseIndex === 3
            ? ""
            : AWAKENING_FLIP_TEXT;

  const textVisible = waitingForGeneration ? waitCycled.visible : phaseIndex === 2 ? cycled.visible : true;

  return (
    <>
      {phaseIndex >= 2 || waitingForGeneration ? (
        <div className="cce-energy-bar-wrap" aria-hidden>
          <div className={`cce-energy-bar ${waitingForGeneration ? "cce-energy-bar--pulse" : ""}`} />
        </div>
      ) : null}

      <div className="cce-stage">
        {phaseIndex === 0 && !waitingForGeneration ? <div className="cce-heartbeat-ring" aria-hidden /> : null}

        {phaseIndex >= 1 && phaseIndex <= 3 && !waitingForGeneration ? (
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

        {phaseIndex >= 3 || waitingForGeneration ? (
          <div
            className={`cce-flip-scene ${phaseIndex >= 4 || waitingForGeneration ? "cce-card-float" : ""}`}
          >
            {waitingForGeneration ? (
              <div className="cce-orbit-wrap" aria-hidden>
                {[
                  { size: 4, delay: 0 },
                  { size: 6, delay: 0.4 },
                  { size: 8, delay: 0.8 },
                  { size: 6, delay: 1.2 },
                  { size: 4, delay: 1.6 },
                ].map((dot, i) => (
                  <span
                    key={i}
                    className="cce-orbit-dot"
                    style={{
                      "--dot-size": `${dot.size}px`,
                      "--orbit-delay": `${dot.delay}s`,
                      "--orbit-duration": `${2.8 + i * 0.3}s`,
                    }}
                  />
                ))}
              </div>
            ) : null}
            <div className={`cce-flip-inner ${phaseIndex >= 4 ? "cce-flip-inner--flip" : ""}`}>
              <div className="cce-flip-face">
                <div className="cce-card-back">
                  <span className="cce-card-back__logo">Prospect Legends</span>
                </div>
              </div>
              <div className="cce-flip-face cce-flip-face--front">
                <div className="cce-card-frame__inner" style={{ position: "relative", height: "100%" }}>
                  <div
                    className={`cce-card-placeholder ${waitingForGeneration ? "cce-card-placeholder--wait" : ""}`}
                    style={{ filter: "blur(0)", animation: "none", opacity: waitingForGeneration ? 0.5 : 0.35 }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {waitingForGeneration ? (
        <div className="cce-wait-pulse" aria-hidden>
          <span className="cce-wait-pulse__ring" />
          <span className="cce-wait-pulse__core" />
        </div>
      ) : null}

      {phaseIndex > 0 || waitingForGeneration ? (
        <ExperienceText text={staticText} visible={textVisible} />
      ) : null}
    </>
  );
}

function RevealSection({
  cardType,
  revealCard,
  videoUrl,
  playerName,
  revealVariant,
  revealConfig,
  revealMode,
  showPrimaryAction,
  primaryActionLabel,
  onPrimaryAction,
  secondaryAction,
  revealTitle,
  onGenerateAnother,
  onStartOver,
}) {
  const isHighlight = cardType === "highlight";
  const isAnimated = cardType === "animated";
  const [mediaReady, setMediaReady] = React.useState(false);
  const rarity = revealCard?.rarity || "standard";
  const config = revealConfig || getRevealConfig(rarity);
  const animateSignature = Boolean(config.animateSignature) && mediaReady;

  React.useEffect(() => {
    setMediaReady(false);
  }, [revealCard, videoUrl, cardType]);

  React.useEffect(() => {
    if (isHighlight && revealCard?.highlight_video_url) return undefined;
    if (videoUrl) return undefined;
    const imageUrl = revealCard?.image_url ? toApiUrl(revealCard.image_url) : "";
    if (!imageUrl) {
      setMediaReady(true);
      return undefined;
    }
    const img = new Image();
    img.onload = () => setMediaReady(true);
    img.onerror = () => setMediaReady(true);
    img.src = imageUrl;
    return undefined;
  }, [isHighlight, revealCard, videoUrl]);

  const variantClass = config.variant || revealVariant;
  const wrapClass = [
    "cce-reveal-card-wrap",
    variantClass === "rise" ? "cce-reveal-card-wrap--rise" : "",
    variantClass === "shimmer" ? "cce-reveal-card-wrap--shimmer" : "",
    variantClass === "flip" ? "cce-reveal-card-wrap--flip" : "",
    variantClass === "slam" ? "cce-reveal-card-wrap--slam" : "",
    variantClass === "materialize" ? "cce-reveal-card-wrap--materialize" : "",
    variantClass === "bounce" || !variantClass ? "cce-reveal-card-wrap--bounce" : "",
    config.permanentGlow ? "cce-reveal-card-wrap--permanent-glow" : "",
    revealMode === "landed" ? "cce-reveal-card-wrap--settled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const readyTitle =
    revealTitle ||
    config.title ||
    (isAnimated
      ? AWAKENING_FLIP_TEXT
      : isHighlight
        ? "Lights. Camera. Card."
        : "Your card is ready!");

  const particleTheme = config.particleTheme || "standard";
  const showConfetti = cardType === "standard" && particleTheme !== "refractor";
  const showRefractorBurst = particleTheme === "refractor";
  const showGoldBurst = particleTheme === "gold" || particleTheme === "legendary";
  const showLegendaryBurst = particleTheme === "legendary" || particleTheme === "black-label";
  const isBlackout = revealMode === "pre_reveal";
  const celebrationMessage = getRevealCelebrationMessage(rarity);
  const showActions = mediaReady && revealMode === "landed" && (showPrimaryAction || onPrimaryAction);

  if (cardType === "standard" && revealMode !== "creating") {
    return (
      <RarityRevealExperience
        rarity={rarity}
        revealCard={revealCard}
        playerName={playerName}
        showActions={showActions}
        primaryActionLabel={primaryActionLabel}
        onPrimaryAction={onPrimaryAction}
        onGenerateAnother={onGenerateAnother}
        onStartOver={onStartOver}
        celebrationMessage={celebrationMessage}
      />
    );
  }

  return (
    <>
      {isBlackout ? (
        <div className="cce-rarity-blackout" aria-hidden>
          {config.subtitle && particleTheme === "black-label" ? (
            <p className="cce-rarity-blackout__text">{config.subtitle}</p>
          ) : null}
        </div>
      ) : null}

      <div
        className={`cce-reveal-flash ${isHighlight ? "cce-reveal-flash--hit" : ""} ${
          particleTheme === "refractor" ? "cce-reveal-flash--silver" : ""
        } ${showGoldBurst ? "cce-reveal-flash--gold" : ""}`}
        aria-hidden
      />
      <div
        className={`cce-reveal-rays ${showGoldBurst ? "cce-reveal-rays--gold" : ""} ${
          showLegendaryBurst ? "cce-reveal-rays--legendary" : ""
        }`}
        aria-hidden
      />

      {showLegendaryBurst ? (
        <div className="cce-rarity-rings" aria-hidden>
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i} className="cce-rarity-ring" style={{ "--ring-i": i }} />
          ))}
        </div>
      ) : null}

      {config.screenShake && revealMode === "reveal" ? (
        <div className="cce-screen-shake" aria-hidden />
      ) : null}

      <div className={`cce-particles cce-particles--${particleTheme}`} aria-hidden>
        {Array.from({ length: particleTheme === "legendary" ? 40 : 24 }, (_, i) => (
          <span key={i} className="cce-particle" style={{ "--i": i }} />
        ))}
      </div>

      {showRefractorBurst ? (
        <div className="cce-particles cce-particles--refractor-burst" aria-hidden>
          {Array.from({ length: 32 }, (_, i) => (
            <span key={i} className="cce-particle cce-particle--refractor" style={{ "--i": i }} />
          ))}
        </div>
      ) : null}

      {showConfetti ? (
        <div className={`cce-confetti cce-confetti--${particleTheme}`} aria-hidden>
          {Array.from({ length: config.confettiMs >= 5000 ? 48 : 28 }, (_, i) => (
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
        {isHighlight && revealCard?.highlight_video_url ? (
          <CardImage
            card={revealCard}
            alt={playerName || "Your highlight card"}
            showInfoBanner
            forcePlay
            variant="detail"
            animateSignature={animateSignature}
            onMediaReady={() => setMediaReady(true)}
          />
        ) : videoUrl ? (
          <video
            src={videoUrl}
            className="cce-reveal-video"
            autoPlay
            muted
            loop
            playsInline
            aria-label={playerName || "Your card video"}
            onLoadedData={() => setMediaReady(true)}
            onError={() => setMediaReady(true)}
          />
        ) : revealCard ? (
          <CardImage
            card={revealCard}
            alt={playerName || "Your generated card"}
            showInfoBanner
            animateSignature={animateSignature}
            onMediaReady={() => setMediaReady(true)}
          />
        ) : null}
      </div>

      <div className="cce-reveal-copy">
        {!mediaReady || revealMode === "pre_reveal" ? (
          <div className="cce-reveal-loading">
            <div className="cce-reveal-loading__spinner" aria-hidden />
            <p className="cce-reveal-title">
              {revealMode === "pre_reveal" && config.subtitle && particleTheme !== "black-label"
                ? config.subtitle
                : "Almost ready..."}
            </p>
          </div>
        ) : (
          <>
            <p className="cce-reveal-title">{readyTitle}</p>
            {config.subtitle && particleTheme !== "black-label" ? (
              <p className="cce-reveal-subtitle">{config.subtitle}</p>
            ) : null}
            {isHighlight ? <span className="cce-reveal-badge">HIGHLIGHT</span> : null}
            {isAnimated ? <span className="cce-reveal-badge cce-reveal-badge--animated">ANIMATED</span> : null}
          </>
        )}
      </div>

      {showActions ? (
        <div className="cce-reveal-actions">
          {celebrationMessage ? (
            <p className="cce-reveal-celebration">{celebrationMessage}</p>
          ) : null}
          <button type="button" className="cce-reveal-btn cce-reveal-btn--primary" onClick={onPrimaryAction}>
            {primaryActionLabel || "Add to Collection"}
          </button>
          {onGenerateAnother ? (
            <button
              type="button"
              className="cce-reveal-btn cce-reveal-btn--secondary"
              onClick={onGenerateAnother}
            >
              Generate Another Preview
            </button>
          ) : null}
          {onStartOver ? (
            <button type="button" className="cce-reveal-btn cce-reveal-btn--tertiary" onClick={onStartOver}>
              Start Over
            </button>
          ) : null}
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
  highlightCardId = "",
  token = "",
  onHighlightVideoReady,
  motionName = "",
  onRevealComplete,
  showPrimaryAction = false,
  primaryActionLabel = "Add to Collection",
  onPrimaryAction,
  secondaryAction = null,
  onGenerateAnother,
  onStartOver,
  onRevealLanded,
  revealTitle = "",
  fullscreen = false,
  hint = "This usually takes 30–60 seconds. Please keep this page open.",
  extraWaitHint = "",
}) {
  const tierConfig = normalizeExperienceTier(tier);
  const cssVars = tierCssVars(tierConfig);
  const completedRef = useRef(false);
  const [highlightPollData, setHighlightPollData] = useState(null);

  const handleHighlightUpdate = useCallback(
    (data) => {
      if (data?.highlight_video_url) {
        setHighlightPollData(data);
        onHighlightVideoReady?.(data);
      }
    },
    [onHighlightVideoReady]
  );

  const handleHighlightCompleted = useCallback(
    (data) => {
      setHighlightPollData(data);
      onHighlightVideoReady?.(data);
    },
    [onHighlightVideoReady]
  );

  useHighlightStatusPolling({
    cardId: highlightCardId,
    token,
    enabled: active && cardType === "highlight" && Boolean(highlightCardId && token),
    pollIntervalMs: HIGHLIGHT_CREATION_POLL_INTERVAL_MS,
    onUpdate: handleHighlightUpdate,
    onCompleted: handleHighlightCompleted,
  });

  const highlightVideoUrl =
    highlightPollData?.highlight_video_url || card?.highlight_video_url || "";
  const apiGenerationComplete = generationComplete;
  const highlightMediaReady = Boolean(highlightVideoUrl);
  const revealReady =
    cardType === "highlight" ? apiGenerationComplete && highlightMediaReady : apiGenerationComplete;
  const waitingForHighlightVideo =
    cardType === "highlight" && apiGenerationComplete && !highlightMediaReady;

  const cardRarity = card?.rarity || "standard";

  const { mode, phaseIndex, elapsedMs, revealConfig, postRevealDisplayMs } = useCardCreationTiming({
    active,
    cardType,
    generationComplete: revealReady,
    rarity: cardRarity,
  });

  const waitingAfterFlip =
    cardType === "animated" && !revealReady && mode === "creating" && phaseIndex >= 4;

  const revealCard = useMemo(() => {
    const base =
      card && typeof card === "object"
        ? { ...card }
        : cardImageUrl
          ? {
              image_url: cardImageUrl,
              tier: tierConfig.key,
              player_name: playerName || "Your Card",
              team_name: teamName,
            }
          : null;
    if (!base) return null;
    if (cardType === "highlight" && highlightVideoUrl) {
      return {
        ...base,
        is_highlight: true,
        highlight_video_url: highlightVideoUrl,
        highlight_status: "completed",
        highlight_trim_start:
          highlightPollData?.highlight_trim_start ?? base.highlight_trim_start ?? 0,
        highlight_trim_end:
          highlightPollData?.highlight_trim_end ?? base.highlight_trim_end ?? null,
      };
    }
    return base;
  }, [
    card,
    cardImageUrl,
    cardType,
    highlightVideoUrl,
    highlightPollData,
    tierConfig.key,
    playerName,
    teamName,
  ]);

  const resolvedVideoUrl = videoUrl ? toApiUrl(videoUrl) : "";

  useEffect(() => {
    if (!active) {
      completedRef.current = false;
      setHighlightPollData(null);
      return undefined;
    }
    return undefined;
  }, [active, highlightCardId]);

  useEffect(() => {
    if (mode !== "landed" || completedRef.current) return undefined;
    if (showPrimaryAction || onPrimaryAction) return undefined;

    completedRef.current = true;
    const timer = window.setTimeout(() => {
      onRevealComplete?.();
    }, postRevealDisplayMs);
    return () => window.clearTimeout(timer);
  }, [active, mode, onRevealComplete, showPrimaryAction, onPrimaryAction, postRevealDisplayMs]);

  useEffect(() => {
    if (active && mode === "landed") {
      onRevealLanded?.();
    }
  }, [active, mode, onRevealLanded]);

  if (!active) return null;

  const isReveal = mode === "pre_reveal" || mode === "reveal" || mode === "landed";
  const isAnimatedReveal = cardType === "animated" && isReveal;
  const revealVariant = cardType === "highlight" ? "rise" : "bounce";
  const showAnimatedActions =
    showPrimaryAction && (cardType === "animated" ? mode === "reveal" || mode === "landed" : mode === "landed");
  const revealShowPrimaryAction = showPrimaryAction;

  const showCceBackdrop = !isReveal || isAnimatedReveal;

  return (
    <div
      className={`cce-scene ${fullscreen ? "cce-scene--fullscreen" : ""} ${isAnimatedReveal ? "cce-scene--animated-reveal" : ""} ${isReveal && !isAnimatedReveal ? "cce-scene--reveal" : ""} ${isReveal && !isAnimatedReveal ? revealConfig.sceneClass : ""}`}
      style={cssVars}
      aria-live="polite"
      aria-busy={!revealReady}
    >
      {showCceBackdrop ? (
        <>
          <div className="cce-bg-gradient" aria-hidden />
          <div className="cce-vignette" aria-hidden />
        </>
      ) : null}

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
              rarity={cardRarity}
              elapsedMs={elapsedMs}
              generationComplete={revealReady}
              templateName={card?.template_name || ""}
            />
          ) : null}
          {cardType === "highlight" ? (
            <ReelExperience
              phaseIndex={phaseIndex}
              playerName={playerName}
              elapsedMs={elapsedMs}
              waitingForVideo={waitingForHighlightVideo && elapsedMs >= MIN_DURATION_MS}
            />
          ) : null}
          {cardType === "animated" ? (
            <AwakeningExperience
              phaseIndex={phaseIndex}
              tierConfig={tierConfig}
              waitingForGeneration={waitingAfterFlip}
              motionName={motionName}
            />
          ) : null}
          {hint ? <p className="cce-hint">{hint}</p> : null}
          {extraWaitHint && cardType === "animated" && !revealReady ? (
            <p className="cce-hint cce-hint--extra">{extraWaitHint}</p>
          ) : null}
        </>
      ) : isAnimatedReveal ? (
        <AnimatedCardReveal
          videoUrl={resolvedVideoUrl}
          playerName={playerName}
          tierConfig={tierConfig}
          theme={theme}
          showPrimaryAction={showAnimatedActions}
          primaryActionLabel={primaryActionLabel}
          onPrimaryAction={() => {
            onPrimaryAction?.();
            onRevealComplete?.();
          }}
          secondaryAction={secondaryAction}
        />
      ) : (
        <RevealSection
          cardType={cardType}
          revealCard={revealCard}
          videoUrl={resolvedVideoUrl}
          playerName={playerName}
          revealVariant={revealVariant}
          revealConfig={revealConfig}
          revealMode={mode}
          showPrimaryAction={revealShowPrimaryAction}
          primaryActionLabel={primaryActionLabel}
          onPrimaryAction={() => {
            onPrimaryAction?.();
            onRevealComplete?.();
          }}
          onGenerateAnother={
            onGenerateAnother
              ? () => {
                  onGenerateAnother();
                  onRevealComplete?.();
                }
              : undefined
          }
          onStartOver={
            onStartOver
              ? () => {
                  onStartOver();
                  onRevealComplete?.();
                }
              : undefined
          }
          secondaryAction={secondaryAction}
          revealTitle={revealTitle}
        />
      )}
    </div>
  );
}
