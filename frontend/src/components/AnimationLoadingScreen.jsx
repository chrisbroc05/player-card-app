import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toApiUrl } from "../config/api";
import { useAnimationStatusPolling } from "../hooks/useAnimationStatusPolling";
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
  "Animated cards sell for more on Free Agency Marketplace",
  "Share your animated card to social at launch",
  "Only you can create this exact card",
  "Animated cards are rare — most players stick to standard",
  "The lower your print run, the more valuable your animation",
  "Pro tip: list your animated card on Free Agency Marketplace to earn credits",
];

const REVEAL_MS = 2800;

export default function AnimationLoadingScreen({
  cardId,
  token,
  onAddToCollection,
  onFailed,
  onRetry,
  allowRetry = true,
  failureCreditMessage = "Animation failed. Please contact support. Your credits have not been charged.",
  completePrimaryLabel = "Add to Collection",
}) {
  const [lineIdx, setLineIdx] = useState(0);
  const [tipIdx, setTipIdx] = useState(0);
  const [tipVisible, setTipVisible] = useState(true);
  const [phase, setPhase] = useState("loading");
  const [completedData, setCompletedData] = useState(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [pollKey, setPollKey] = useState(0);

  const handlePollCompleted = useCallback((data) => {
    setCompletedData(data);
    setPhase("reveal");
  }, []);

  const handlePollFailed = useCallback(
    (data) => {
      setCompletedData(data);
      setPhase("failed");
      onFailed?.(data);
    },
    [onFailed]
  );

  const { status, timedOut, failed, reset } = useAnimationStatusPolling({
    cardId,
    token,
    enabled: phase === "loading" && !retrying,
    pollKey,
    onCompleted: handlePollCompleted,
    onFailed: handlePollFailed,
  });

  useEffect(() => {
    if (phase !== "reveal") return undefined;
    const timer = window.setTimeout(() => setPhase("complete"), REVEAL_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

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

  const videoUrl = completedData?.animated_video_url ? toApiUrl(completedData.animated_video_url) : "";
  const cardShareUrl =
    typeof window !== "undefined" && cardId
      ? `${window.location.origin}/card/${encodeURIComponent(cardId)}`
      : "";

  async function handleShare() {
    if (!cardShareUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "My Future Legends animated card",
          url: cardShareUrl,
        });
        return;
      }
      await navigator.clipboard.writeText(cardShareUrl);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2500);
    } catch {
      /* user cancelled share sheet */
    }
  }

  async function handleRetryClick() {
    if (!onRetry) return;
    setRetrying(true);
    try {
      await onRetry();
      reset();
      setCompletedData(null);
      setPollKey((k) => k + 1);
      setPhase("loading");
    } finally {
      setRetrying(false);
    }
  }

  if (timedOut) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <p className="text-lg font-semibold text-white">Taking longer than expected</p>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          Animation is still in progress. We&apos;ll email you when your card is ready — you can safely leave this
          page.
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

  if (phase === "failed" || failed) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <p className="text-3xl opacity-60" aria-hidden>
          ⚠
        </p>
        <h2 className="mt-4 text-xl font-semibold text-white">Animation failed</h2>
        <p className="mt-3 max-w-md text-sm text-slate-400">{failureCreditMessage}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {allowRetry && onRetry ? (
            <button
              type="button"
              disabled={retrying}
              onClick={handleRetryClick}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-violet-500 px-6 text-sm font-semibold text-white disabled:opacity-50"
            >
              {retrying ? "Retrying…" : "Try Again"}
            </button>
          ) : null}
          <Link
            to="/my-collection"
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-white/20 px-6 text-sm font-medium text-slate-200"
          >
            Go to My Collection
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "reveal" || phase === "complete") {
    return (
      <div
        className={`animation-complete-scene pack-opening-scene pack-opening-scene--reveal pack-tier-allstar ${
          phase === "complete" ? "animation-complete-scene--landed" : ""
        }`}
      >
        <div className="pack-opening-vignette" aria-hidden />
        <div className="pack-opening-rays" aria-hidden />
        {phase === "reveal" ? (
          <>
            <div className="pack-opening-flash pack-burst-allstar" aria-hidden />
            <div className="pack-opening-burst pack-burst-allstar" aria-hidden>
              {Array.from({ length: 16 }, (_, i) => (
                <span key={i} className="pack-opening-spark" style={{ "--i": i }} />
              ))}
            </div>
          </>
        ) : null}

        {videoUrl ? (
          <div
            className={`animation-complete-video-wrap pack-opening-card-wrap ${
              phase === "complete" ? "pack-opening-card-wrap--landed animation-complete-video-wrap--landed" : ""
            }`}
          >
            <video
              src={videoUrl}
              className="pack-opening-card animation-complete-video"
              autoPlay
              muted
              loop
              playsInline
              aria-label="Your animated card"
            />
          </div>
        ) : null}

        {phase === "complete" ? (
          <div className="animation-complete-copy">
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">Your animated card is ready!</h2>
            <p className="mt-2 max-w-md text-sm text-slate-300">
              Your animated card is live and ready to share with the world.
            </p>
            <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => onAddToCollection?.(completedData)}
                className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-xl bg-neonTeal px-6 text-sm font-semibold text-slate-950"
              >
                {completePrimaryLabel}
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-xl border border-white/25 px-6 text-sm font-medium text-slate-100 hover:border-white/40 hover:bg-white/5"
              >
                {shareCopied ? "Link copied!" : "Share"}
              </button>
            </div>
          </div>
        ) : (
          <p className="pack-opening-headline mt-8 text-center text-white">Revealing your animation…</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/90">Step 2 of 2</p>

      <div
        className="animation-card-glow relative mb-8 mt-4 h-40 w-28 rounded-xl border border-violet-400/40 bg-gradient-to-b from-violet-500/20 to-cardBg2 sm:h-48 sm:w-32"
        aria-hidden
      >
        <div className="animation-shimmer absolute inset-0 rounded-xl" />
      </div>

      <h2 className="max-w-md text-center text-2xl font-semibold text-white">Animating your card...</h2>
      <p className="mt-2 max-w-md text-center text-sm text-violet-200/90">
        Our AI is bringing your card to life. This takes about 30–60 seconds.
      </p>

      <p className="mt-5 max-w-md text-center text-sm text-slate-400 transition-opacity duration-500">
        {STATUS_LINES[lineIdx]}
      </p>
      <p className="mt-1 text-xs text-slate-500">{animationStatusUserLine(status)}</p>

      <div className="mt-8 h-2 w-full max-w-sm overflow-hidden rounded-full border border-violet-400/25 bg-violet-950/50">
        <div className="animation-progress-indeterminate h-full w-2/5 rounded-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-neonTeal shadow-[0_0_12px_rgba(167,139,250,0.45)]" />
      </div>
      <p className="mt-3 text-xs font-medium text-violet-200/80">Animation in progress — not card generation</p>

      <p
        className={`mt-10 max-w-sm text-center text-sm text-slate-400 transition-opacity duration-300 ${
          tipVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        {TIPS[tipIdx]}
      </p>

      <p className="mt-12 max-w-md text-center text-xs text-slate-600">
        You can switch tabs — we&apos;ll keep checking and update when your animation is ready
      </p>
    </div>
  );
}
