import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL, authHeaders } from "../config/api";
import { animationStatusUserLine } from "../utils/animationCard";

const STATUS_LINES = [
  "Warming up the highlight reel...",
  "Teaching your player some moves...",
  "Adding that professional touch...",
  "Almost ready for the big leagues...",
  "Putting the finishing touches on...",
  "Getting ready to make history...",
];

const TIPS = [
  "Animated cards sell for more on Free Agency",
  "Share your animated card to social at launch",
  "Only you can create this exact card",
  "Animated cards are rare — most players stick to standard",
  "The lower your print run, the more valuable your animation",
  "Pro tip: list your animated card on Free Agency to earn credits",
];

export default function AnimationLoadingScreen({
  cardId,
  token,
  onCompleted,
  onFailed,
}) {
  const [status, setStatus] = useState("pending");
  const [lineIdx, setLineIdx] = useState(0);
  const [tipIdx, setTipIdx] = useState(0);
  const [tipVisible, setTipVisible] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const startRef = React.useRef(Date.now());

  const poll = useCallback(async () => {
    if (!cardId || !token) return null;
    const res = await fetch(`${API_BASE_URL}/cards/${encodeURIComponent(cardId)}/animation-status`, {
      headers: { ...authHeaders(token) },
    });
    if (!res.ok) return null;
    return res.json();
  }, [cardId, token]);

  useEffect(() => {
    const t = setInterval(() => setLineIdx((i) => (i + 1) % STATUS_LINES.length), 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setTipVisible(false);
      setTimeout(() => {
        setTipIdx((i) => (i + 1) % TIPS.length);
        setTipVisible(true);
      }, 300);
    }, 6000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!cardId || !token) return undefined;
    let cancelled = false;
    const iv = setInterval(async () => {
      if (cancelled) return;
      if (Date.now() - startRef.current > 180000) {
        setTimedOut(true);
        clearInterval(iv);
        return;
      }
      const data = await poll();
      if (!data || cancelled) return;
      const st = (data.animation_status || "").toLowerCase();
      setStatus(st);
      if (st === "completed") {
        clearInterval(iv);
        setShowSuccess(true);
        setTimeout(() => {
          if (!cancelled) onCompleted?.(data);
        }, 2000);
      } else if (st === "failed") {
        clearInterval(iv);
        onFailed?.();
      }
    }, 5000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [cardId, token, poll, onCompleted, onFailed]);

  if (timedOut) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <p className="text-lg font-semibold text-white">This is taking longer than expected</p>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          We&apos;ll email you when it&apos;s ready. You can safely leave this page.
        </p>
        <Link
          to="/my-collection"
          className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-neonTeal px-6 text-sm font-semibold text-slate-950"
        >
          Go to My Collection
        </Link>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <p className="text-4xl text-emerald-400" aria-hidden>
          ✓
        </p>
        <p className="mt-4 text-xl font-semibold text-emerald-100">Your animated card is ready!</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-12">
      <div className="animation-card-glow relative mb-10 h-40 w-28 rounded-xl border border-violet-400/40 bg-gradient-to-b from-violet-500/20 to-cardBg2 sm:h-48 sm:w-32" aria-hidden>
        <div className="animation-shimmer absolute inset-0 rounded-xl" />
      </div>

      <p className="max-w-md text-center text-xl font-semibold text-white transition-opacity duration-500">
        {STATUS_LINES[lineIdx]}
      </p>
      <p className="mt-2 text-sm text-violet-200/90">{animationStatusUserLine(status)}</p>

      <div className="mt-8 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
        <div className="animation-progress-indeterminate h-full w-1/3 rounded-full bg-gradient-to-r from-neonTeal via-violet-400 to-neonBlue" />
      </div>
      <p className="mt-3 text-xs text-slate-500">This usually takes 20 to 40 seconds</p>

      <p
        className={`mt-10 max-w-sm text-center text-sm text-slate-400 transition-opacity duration-300 ${
          tipVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        {TIPS[tipIdx]}
      </p>

      <p className="mt-12 max-w-md text-center text-xs text-slate-600">
        You can close this tab — we&apos;ll email you when your card is ready
      </p>
    </div>
  );
}
