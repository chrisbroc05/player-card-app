import React, { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { toApiUrl } from "../config/api";
import CardCreationExperience from "./CardCreationExperience";
import { useAnimationStatusPolling } from "../hooks/useAnimationStatusPolling";

export default function AnimationLoadingScreen({
  cardId,
  token,
  tier = "rookie",
  theme = "",
  playerName = "",
  teamName = "",
  cardImageUrl = "",
  card = null,
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
    } finally {
      setRetrying(false);
    }
  }

  const shareButton = (
    <button
      type="button"
      onClick={handleShare}
      className="cce-reveal-btn cce-reveal-btn--secondary"
    >
      {shareCopied ? "Link copied!" : "Share"}
    </button>
  );

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
      showPrimaryAction
      primaryActionLabel={completePrimaryLabel}
      onPrimaryAction={() => onAddToCollection?.(completedData)}
      secondaryAction={shareButton}
      hint="Our AI is bringing your card to life. This takes about 30–60 seconds."
    />
  );
}
