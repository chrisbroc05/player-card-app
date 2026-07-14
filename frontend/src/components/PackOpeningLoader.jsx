import React, { useEffect, useMemo, useRef, useState } from "react";
import CardImage from "./CardImage";

const MIN_BUILD_MS = 8000;
const ENTER_MS = 2000;
const REVEAL_MS = 2800;
const DISPLAY_MS = 2200;
const MESSAGE_INTERVAL_MS = 2000;

const TIER_PACK = {
  rookie: {
    label: "Rookie",
    glow: "pack-tier-rookie",
    burst: "pack-burst-rookie",
  },
  all_star: {
    label: "All-Star",
    glow: "pack-tier-allstar",
    burst: "pack-burst-allstar",
  },
  legends: {
    label: "Legends",
    glow: "pack-tier-legends",
    burst: "pack-burst-legends",
  },
};

function buildMessages(themeLabel, isAnimated) {
  const theme = themeLabel && themeLabel !== "Default (no theme)" ? themeLabel : "Premium";
  const msgs = [
    `Applying ${theme} theme...`,
    "Rendering your player...",
    "Adding finishing touches...",
    "Almost ready...",
  ];
  if (isAnimated) {
    msgs.splice(1, 0, "Preparing your animated card...");
  }
  return msgs;
}

/**
 * Cinematic pack-opening loader for card generation.
 * Runs in parallel with API; reveals when generationComplete and min time elapsed.
 */
export default function PackOpeningLoader({
  active,
  generationComplete,
  cardImageUrl,
  card = null,
  tier = "rookie",
  themeLabel = "",
  isAnimated = false,
  onComplete,
}) {
  const tierKey = (tier || "rookie").toLowerCase().replace(/-/g, "_");
  const tierStyle = TIER_PACK[tierKey] || TIER_PACK.rookie;
  const messages = useMemo(() => buildMessages(themeLabel, isAnimated), [themeLabel, isAnimated]);

  const [phase, setPhase] = useState("enter");
  const [messageIdx, setMessageIdx] = useState(0);
  const startRef = useRef(0);
  const revealScheduledRef = useRef(false);

  useEffect(() => {
    if (!active) {
      setPhase("enter");
      setMessageIdx(0);
      revealScheduledRef.current = false;
      return undefined;
    }

    startRef.current = Date.now();
    setPhase("enter");
    setMessageIdx(0);
    revealScheduledRef.current = false;

    const enterTimer = window.setTimeout(() => setPhase("anticipation"), ENTER_MS);
    return () => window.clearTimeout(enterTimer);
  }, [active]);

  useEffect(() => {
    if (!active || phase === "reveal" || phase === "display" || phase === "done") return undefined;
    if (phase !== "anticipation" && phase !== "enter") return undefined;

    const iv = window.setInterval(() => {
      setMessageIdx((i) => (i + 1) % messages.length);
    }, MESSAGE_INTERVAL_MS);

    return () => window.clearInterval(iv);
  }, [active, phase, messages.length]);

  useEffect(() => {
    if (!active || !generationComplete || revealScheduledRef.current) return undefined;
    if (phase !== "anticipation" && phase !== "enter") return undefined;

    const elapsed = Date.now() - startRef.current;
    const wait = Math.max(0, MIN_BUILD_MS - elapsed);

    revealScheduledRef.current = true;
    const timer = window.setTimeout(() => setPhase("reveal"), wait);
    return () => window.clearTimeout(timer);
  }, [active, generationComplete, phase]);

  useEffect(() => {
    if (phase !== "reveal") return undefined;
    const timer = window.setTimeout(() => setPhase("display"), REVEAL_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "display") return undefined;
    const timer = window.setTimeout(() => {
      setPhase("done");
      onComplete?.();
    }, DISPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [phase, onComplete]);

  if (!active || phase === "done") return null;

  const revealCard = useMemo(() => {
    if (card) return card;
    if (!cardImageUrl) return null;
    return {
      image_url: cardImageUrl,
      tier: tierKey,
      player_name: "Your Card",
    };
  }, [card, cardImageUrl, tierKey]);

  const showPack = phase === "enter" || phase === "anticipation";
  const showReveal = phase === "reveal" || phase === "display";
  const statusMessage = phase === "enter" ? "Your pack is arriving..." : messages[messageIdx];

  return (
    <div
      className={`pack-opening-scene ${tierStyle.glow} ${showReveal ? "pack-opening-scene--reveal" : ""}`}
      aria-live="polite"
      aria-busy={!generationComplete}
    >
      <div className="pack-opening-vignette" aria-hidden />
      <div className="pack-opening-rays" aria-hidden />
      <div className="pack-opening-particles" aria-hidden>
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className="pack-opening-particle" style={{ "--i": i }} />
        ))}
      </div>

      {showPack ? (
        <div className={`pack-opening-pack ${phase === "anticipation" ? "pack-opening-pack--pulse" : "pack-opening-pack--enter"}`}>
          <div className="pack-opening-pack-shine" aria-hidden />
          <div className="pack-opening-pack-body">
            <p className="pack-opening-brand">Future Legends</p>
            <p className="pack-opening-tier">{tierStyle.label}</p>
            <div className="pack-opening-seal" aria-hidden />
          </div>
        </div>
      ) : null}

      {showReveal ? (
        <>
          <div className={`pack-opening-flash ${tierStyle.burst}`} aria-hidden />
          <div className={`pack-opening-burst ${tierStyle.burst}`} aria-hidden>
            {Array.from({ length: 16 }, (_, i) => (
              <span key={i} className="pack-opening-spark" style={{ "--i": i }} />
            ))}
          </div>
          {revealCard ? (
            <div className={`pack-opening-card-wrap ${phase === "display" ? "pack-opening-card-wrap--landed" : ""}`}>
              <CardImage card={revealCard} alt="Your generated card" showInfoBanner />
            </div>
          ) : null}
        </>
      ) : null}

      <div className="pack-opening-copy">
        <p className="pack-opening-headline">
          Generating your card
          <span className="pack-opening-ellipsis" aria-hidden>
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </p>
        <p className="pack-opening-subline">
          {phase === "display" ? "Preparing your preview actions..." : statusMessage}
        </p>
        <p className="pack-opening-hint">This usually takes 30–60 seconds. Please keep this page open.</p>
      </div>
    </div>
  );
}
