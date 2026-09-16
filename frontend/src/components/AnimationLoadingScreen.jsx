import React, { Component, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toApiUrl } from "../config/api";
import { useAnimationStatusPolling } from "../hooks/useAnimationStatusPolling";
import { ANIMATION_FAILURE_TIMEOUT_MS } from "../utils/animationWaitMessaging";

class AnimationLoadingErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("Animation loading screen render error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="animation-loading-screen">
          <div className="animation-loading-screen__content">
            <p className="animation-loading-screen__title">Animating Your Card...</p>
            <p className="animation-loading-screen__subtitle">
              Something went wrong displaying the progress screen. Your animation may still be processing.
            </p>
            {this.props.onRetry ? (
              <button
                type="button"
                className="animation-loading-screen__primary-btn"
                onClick={this.props.onRetry}
              >
                Try Again
              </button>
            ) : null}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function LoadingDots() {
  return (
    <div className="animation-loading-screen__dots" aria-hidden>
      <span />
      <span />
      <span />
    </div>
  );
}

function ProgressBar({ progress }) {
  const pct = Math.min(100, Math.max(8, progress));
  return (
    <div className="animation-loading-screen__progress" aria-hidden>
      <div className="animation-loading-screen__progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

function AnimationLoadingScreenInner({
  cardId,
  token,
  cardImageUrl = "",
  onAddToCollection,
  onFailed,
  onRetry,
  allowRetry = true,
  failureCreditMessage = "Something went wrong. Your credits have been refunded.",
  completePrimaryLabel = "View in Collection",
}) {
  const [completedData, setCompletedData] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const [pollKey, setPollKey] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (completedData?.animated_video_url || retrying) return undefined;
    const startAt = Date.now();
    setElapsedMs(0);
    const timerId = window.setInterval(() => {
      setElapsedMs(Date.now() - startAt);
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [cardId, pollKey, completedData?.animated_video_url, retrying]);

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
  const isComplete = Boolean(videoUrl);
  const showFailure = failed || (timedOut && !isComplete);

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

  const progress = Math.min(95, 8 + (elapsedMs / ANIMATION_FAILURE_TIMEOUT_MS) * 87);

  return (
    <div className="animation-loading-screen">
      <div className="animation-loading-screen__content">
        {isComplete ? (
          <>
            <div className="animation-loading-screen__success-card">
              {videoUrl ? (
                <video
                  src={videoUrl}
                  className="animation-loading-screen__success-video"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : cardImageUrl ? (
                <img
                  src={toApiUrl(cardImageUrl)}
                  alt="Your animated card"
                  className="animation-loading-screen__success-image"
                />
              ) : null}
            </div>
            <h2 className="animation-loading-screen__success-title">Your Animated Card is Ready! 🎉</h2>
            <button
              type="button"
              className="animation-loading-screen__primary-btn"
              onClick={() => onAddToCollection?.(completedData)}
            >
              {completePrimaryLabel}
            </button>
          </>
        ) : showFailure ? (
          <>
            <p className="animation-loading-screen__failure-icon" aria-hidden>
              ⚠
            </p>
            <h2 className="animation-loading-screen__title">Animation failed</h2>
            <p className="animation-loading-screen__subtitle">{failureCreditMessage}</p>
            <div className="animation-loading-screen__actions">
              {allowRetry && onRetry ? (
                <button
                  type="button"
                  disabled={retrying}
                  className="animation-loading-screen__primary-btn"
                  onClick={handleRetryClick}
                >
                  {retrying ? "Retrying…" : "Try Again"}
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <div className="animation-loading-screen__spinner" aria-hidden />
            <h2 className="animation-loading-screen__title">Animating Your Card...</h2>
            <p className="animation-loading-screen__subtitle">This usually takes 30-60 seconds</p>
            <ProgressBar progress={progress} />
            <LoadingDots />
          </>
        )}
      </div>
    </div>
  );
}

export default function AnimationLoadingScreen(props) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return createPortal(
    <AnimationLoadingErrorBoundary onRetry={props.onRetry}>
      <AnimationLoadingScreenInner {...props} />
    </AnimationLoadingErrorBoundary>,
    document.body
  );
}
