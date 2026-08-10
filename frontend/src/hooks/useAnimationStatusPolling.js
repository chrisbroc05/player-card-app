import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE_URL, authHeaders } from "../config/api";
import { normalizeAnimationStatus } from "../utils/animationCard";
import { ANIMATION_EMAIL_FALLBACK_MS } from "../utils/animationWaitMessaging";

export const ANIMATION_POLL_INTERVAL_MS = 5000;
export { ANIMATION_EMAIL_FALLBACK_MS as ANIMATION_MAX_POLL_MS };

/**
 * Poll GET /cards/{id}/animation-status until completed or failed.
 * Sets timedOut after ANIMATION_EMAIL_FALLBACK_MS (8 min) but keeps polling.
 * Survives tab visibility changes and keeps callbacks stable via refs.
 */
export function useAnimationStatusPolling({
  cardId,
  token,
  enabled = true,
  pollKey = 0,
  onCompleted,
  onFailed,
  onTimeout,
}) {
  const onCompletedRef = useRef(onCompleted);
  const onFailedRef = useRef(onFailed);
  const onTimeoutRef = useRef(onTimeout);
  const completionNotifiedRef = useRef(false);

  const [status, setStatus] = useState("pending");
  const [result, setResult] = useState(null);
  const [timedOut, setTimedOut] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onCompletedRef.current = onCompleted;
  }, [onCompleted]);

  useEffect(() => {
    onFailedRef.current = onFailed;
  }, [onFailed]);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  const pollOnce = useCallback(async () => {
    if (!cardId || !token) return null;
    const res = await fetch(`${API_BASE_URL}/cards/${encodeURIComponent(cardId)}/animation-status`, {
      headers: { ...authHeaders(token) },
    });
    if (!res.ok) return null;
    return res.json();
  }, [cardId, token]);

  const reset = useCallback(() => {
    completionNotifiedRef.current = false;
    setStatus("pending");
    setResult(null);
    setTimedOut(false);
    setFailed(false);
  }, []);

  useEffect(() => {
    if (!enabled || !cardId || !token) return undefined;

    let cancelled = false;
    let intervalId = null;
    const startAt = Date.now();

    completionNotifiedRef.current = false;
    setStatus("pending");
    setResult(null);
    setTimedOut(false);
    setFailed(false);

    const finishCompleted = (data) => {
      if (cancelled || completionNotifiedRef.current) return;
      completionNotifiedRef.current = true;
      if (intervalId) clearInterval(intervalId);
      setResult(data);
      setStatus("completed");
      onCompletedRef.current?.(data);
    };

    const finishFailed = (data) => {
      if (cancelled || completionNotifiedRef.current) return;
      completionNotifiedRef.current = true;
      if (intervalId) clearInterval(intervalId);
      setFailed(true);
      setStatus("failed");
      onFailedRef.current?.(data);
    };

    const runPoll = async () => {
      if (cancelled || completionNotifiedRef.current) return;

      if (Date.now() - startAt > ANIMATION_EMAIL_FALLBACK_MS) {
        setTimedOut(true);
        onTimeoutRef.current?.();
      }

      const data = await pollOnce();
      if (cancelled || !data || completionNotifiedRef.current) return;

      const st = normalizeAnimationStatus(data);
      setStatus(st);

      if (st === "completed") {
        if (data.animated_video_url) {
          finishCompleted(data);
        }
        return;
      }

      if (st === "failed") {
        finishFailed(data);
      }
    };

    runPoll();
    intervalId = window.setInterval(runPoll, ANIMATION_POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        runPoll();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, cardId, token, pollKey, pollOnce]);

  return { status, result, timedOut, failed, reset };
}
