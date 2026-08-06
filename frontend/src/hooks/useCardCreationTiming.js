import { useEffect, useRef, useState } from "react";

export const MIN_DURATION_MS = 15000;
export const REVEAL_ANIMATION_MS = 3200;
export const POST_REVEAL_DISPLAY_MS = 2800;

/** Phase start times (ms) per card type */
export const PHASE_STARTS = {
  standard: [0, 2000, 6000, 12000],
  highlight: [0, 2000, 7000, 13000],
  animated: [0, 1000, 4000, 10000, 13000],
};

export function normalizeExperienceCardType(cardType) {
  const t = String(cardType || "standard").toLowerCase();
  if (t === "highlight") return "highlight";
  if (t === "animated" || t === "animation") return "animated";
  return "standard";
}

export function phaseIndexForElapsed(elapsed, cardType) {
  const starts = PHASE_STARTS[normalizeExperienceCardType(cardType)] || PHASE_STARTS.standard;
  let idx = 0;
  for (let i = starts.length - 1; i >= 0; i -= 1) {
    if (elapsed >= starts[i]) {
      idx = i;
      break;
    }
  }
  return idx;
}

export function lastAnticipationPhase(cardType) {
  const starts = PHASE_STARTS[normalizeExperienceCardType(cardType)] || PHASE_STARTS.standard;
  return starts.length - 1;
}

/**
 * Manages 15s minimum creation timing and reveal trigger.
 * Returns: mode ('creating' | 'reveal' | 'landed' | 'done'), phaseIndex, elapsedMs
 */
export function useCardCreationTiming({ active, cardType, generationComplete }) {
  const [mode, setMode] = useState("creating");
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startRef = useRef(0);
  const revealScheduledRef = useRef(false);
  const tickRef = useRef(null);

  useEffect(() => {
    if (!active) {
      setMode("creating");
      setPhaseIndex(0);
      setElapsedMs(0);
      revealScheduledRef.current = false;
      startRef.current = 0;
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return undefined;
    }

    startRef.current = Date.now();
    revealScheduledRef.current = false;
    setMode("creating");
    setPhaseIndex(0);
    setElapsedMs(0);

    tickRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      setElapsedMs(elapsed);

      const lastPhase = lastAnticipationPhase(cardType);
      let idx = phaseIndexForElapsed(elapsed, cardType);
      if (idx > lastPhase) idx = lastPhase;
      setPhaseIndex(idx);
    }, 50);

    return () => {
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [active, cardType]);

  useEffect(() => {
    if (!active || !generationComplete || revealScheduledRef.current) return undefined;
    if (mode !== "creating") return undefined;

    revealScheduledRef.current = true;
    const elapsed = Date.now() - (startRef.current || Date.now());
    const remaining = Math.max(0, MIN_DURATION_MS - elapsed);

    const timer = window.setTimeout(() => setMode("reveal"), remaining);
    return () => window.clearTimeout(timer);
  }, [active, generationComplete, mode, cardType]);

  useEffect(() => {
    if (mode !== "reveal") return undefined;
    const timer = window.setTimeout(() => setMode("landed"), REVEAL_ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, [mode]);

  return { mode, phaseIndex, elapsedMs, lastPhase: lastAnticipationPhase(cardType) };
}
