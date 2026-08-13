import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toApiUrl } from "../config/api";
import CardCreationExperience from "./CardCreationExperience";
import { useAnimationStatusPolling } from "../hooks/useAnimationStatusPolling";
import {
  ANIMATION_EMAIL_WAIT_MESSAGE,
  ANIMATION_PRIMARY_HINT,
  animationExtraWaitMessage,
} from "../utils/animationWaitMessaging";

export default function AnimationLoadingScreen({
  cardId,
  token,
  tier = "rookie",
  theme = "",
  playerName = "",
  teamName = "",
  cardImageUrl = "",
  card = null,
  motionName = "",
  onAddToCollection,
  onFailed,
  onRetry,
  allowRetry = true,
  failureCreditMessage = "Animation failed. Please contact support. Your credits have not been charged.",
  completePrimaryLabel = "Add to Collection",
}) {
  const [completedData, setCompletedData] = useState(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [pollKey, setPollKey] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (completedData?.animated_video_url || failed || retrying) return undefined;
    const startAt = Date.now();
    setElapsedMs(0);
    const timerId = window.setInterval(() => {
      setElapsedMs(Date.now() - startAt);
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [cardId, pollKey, completedData?.animated_video_url, failed, retrying]);

  const handlePollCompleted = useCallback((data) => {
    setCompletedData(data);
  }, []);

  const handlePollFailed = useCallback(
    (data) => {
      setCompletedData(data);
      onFailed?.(data);
    },
    [onFailed]
  );

  const { timedOut, failed, reset } = useAnimationStatusPolling({
    cardId,
    token,
    enabled: !retrying,
    pollKey,
    onCompleted: handlePollCompleted,
    onFailed: handlePollFailed,
  });

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
          title: "My Prospect Legends animated card",
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
    } finally {
      setRetrying(false);
    }
  }

  const shareButton = (
    <button type="button" onClick={handleShare} className="acr-btn acr-btn--secondary">
      {shareCopied ? "Link copied!" : "Share Card"}
    </button>
  );

  if (timedOut && !completedData?.animated_video_url) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <p className="text-lg font-semibold text-white">Still working on your animation</p>
        <p className="mt-2 max-w-md text-sm text-slate-400">{ANIMATION_EMAIL_WAIT_MESSAGE}</p>
        <Link
          to="/my-collection"
          className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-neonTeal px-6 text-sm font-semibold text-slate-950"
        >
          Go to My Collection
        </Link>
      </div>
    );
  }

  if (failed) {
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

  return (
    <CardCreationExperience
      active
      fullscreen
      cardType="animated"
      tier={tier}
      theme={theme}
      playerName={playerName}
      teamName={teamName}
      generationComplete={Boolean(completedData?.animated_video_url)}
      cardImageUrl={cardImageUrl}
      card={card}
      videoUrl={videoUrl}
      motionName={motionName}
      showPrimaryAction
      primaryActionLabel={completePrimaryLabel}
      onPrimaryAction={() => onAddToCollection?.(completedData)}
      secondaryAction={shareButton}
      hint={ANIMATION_PRIMARY_HINT}
      extraWaitHint={animationExtraWaitMessage(elapsedMs)}
    />
  );
}
