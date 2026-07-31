import React, { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL, authHeaders, toApiUrl } from "../config/api";
import {
  CARD_IMAGE_MEDIA_CLASS,
  CARD_VIDEO_CLASS,
  CARD_VIDEO_DETAIL_WRAPPER,
  CARD_VIDEO_WRAPPER_OVERLAY,
} from "../utils/cardImageStyles";
import { cardDisplaySizeFromFrame } from "../utils/cardTemplate";
import { isAnimatedCard, isAnimationInProgress } from "../utils/animationCard";
import { isHighlightCard, isHighlightInProgress } from "../utils/highlightCard";
import { useIsMobileViewport } from "../hooks/usePrefersReducedMotion";
import CardDisplay from "./CardDisplay";

function resolveCardFields(card, props) {
  if (card && typeof card === "object") {
    return {
      imageUrl: card.image_url ?? props.imageUrl,
      animatedVideoUrl: card.animated_video_url ?? props.animatedVideoUrl,
      isAnimated: card.is_animated ?? props.isAnimated,
      animationStatus: card.animation_status ?? props.animationStatus,
      highlightVideoUrl: card.highlight_video_url ?? props.highlightVideoUrl,
      highlightThumbnailUrl: card.highlight_thumbnail_url ?? props.highlightThumbnailUrl,
      isHighlight: card.is_highlight ?? props.isHighlight,
      highlightStatus: card.highlight_status ?? props.highlightStatus,
      highlightTrimStart: card.highlight_trim_start ?? props.highlightTrimStart,
      highlightTrimEnd: card.highlight_trim_end ?? props.highlightTrimEnd,
    };
  }
  return {
    imageUrl: props.imageUrl,
    animatedVideoUrl: props.animatedVideoUrl,
    isAnimated: props.isAnimated,
    animationStatus: props.animationStatus,
    highlightVideoUrl: props.highlightVideoUrl,
    highlightThumbnailUrl: props.highlightThumbnailUrl,
    isHighlight: props.isHighlight,
    highlightStatus: props.highlightStatus,
    highlightTrimStart: props.highlightTrimStart,
    highlightTrimEnd: props.highlightTrimEnd,
  };
}

function ProtectedMediaShell({ protectMedia, children }) {
  if (!protectMedia) return children;

  return (
    <div className="card-media-protected-wrap relative h-full w-full min-h-0 min-w-0">
      {children}
      <div className="card-media-watermark" aria-hidden />
      <div
        className="card-media-protect-overlay"
        aria-hidden
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}

function buildSyntheticCard(card, imageUrl) {
  if (card && typeof card === "object") return card;
  if (!imageUrl) return null;
  return { image_url: imageUrl, player_name: "Player" };
}

function HighlightSoundToggle({ muted, onToggle }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
      title={muted ? "Tap to unmute" : "Tap to mute"}
      aria-label={muted ? "Tap to unmute" : "Tap to mute"}
      className="absolute bottom-2 right-2 z-[8] flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/60 text-sm text-white backdrop-blur-sm transition hover:bg-black/75"
    >
      {muted ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 5L6 9H3v6h3l5 4V5z" />
          <line x1="17" y1="9" x2="23" y2="15" />
          <line x1="23" y1="9" x2="17" y2="15" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 5L6 9H3v6h3l5 4V5z" />
          <path d="M15.5 8.5a5 5 0 010 7" />
          <path d="M18 6a8 8 0 010 12" />
        </svg>
      )}
    </button>
  );
}

/** Renders card media inside the fixed CardDisplay template app-wide */
export default function CardImage({
  card,
  imageUrl,
  animatedVideoUrl,
  highlightVideoUrl,
  highlightThumbnailUrl,
  isAnimated: isAnimatedProp,
  isHighlight: isHighlightProp,
  animationStatus,
  highlightStatus,
  highlightTrimStart,
  highlightTrimEnd,
  alt,
  className = "",
  frameClassName = "",
  cacheBust,
  playOnHover = false,
  forcePlay = false,
  showAnimatedBadge = true,
  showHighlightBadge = true,
  showInProgressOverlay = true,
  showInfoBanner,
  infoBannerVariant = "default",
  variant = "grid",
  protectMedia = false,
  useOwnerVideoProxy = false,
  token = "",
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [mobileActive, setMobileActive] = useState(false);
  const [ownerVideoBlobUrl, setOwnerVideoBlobUrl] = useState(null);
  const [highlightMuted, setHighlightMuted] = useState(true);
  const [needsTrimPlayback, setNeedsTrimPlayback] = useState(false);
  const videoRef = useRef(null);
  const isMobile = useIsMobileViewport();
  const isDetail = variant === "detail";
  const isGridBrowse = variant === "grid" && playOnHover;
  const cardIdForApi = card?.card_id || "";

  const fields = resolveCardFields(card, {
    imageUrl,
    animatedVideoUrl,
    highlightVideoUrl,
    highlightThumbnailUrl,
    isAnimated: isAnimatedProp,
    isHighlight: isHighlightProp,
    animationStatus,
    highlightStatus,
    highlightTrimStart,
    highlightTrimEnd,
  });

  const syntheticCard = buildSyntheticCard(card, fields.imageUrl);
  const cardForTypeChecks = card && typeof card === "object" ? card : syntheticCard;

  const animatedActive =
    isAnimatedCard({ ...cardForTypeChecks, ...fields }) &&
    fields.animatedVideoUrl &&
    !isAnimationInProgress(fields);
  const highlightActive =
    !animatedActive &&
    isHighlightCard({ ...cardForTypeChecks, ...fields }) &&
    fields.highlightVideoUrl &&
    !isHighlightInProgress(fields);

  const hasVideo = (animatedActive || highlightActive) && !videoFailed;
  const inProgress =
    showInProgressOverlay &&
    (isAnimationInProgress(fields) || isHighlightInProgress(fields));

  const posterSourceUrl = highlightActive && fields.highlightThumbnailUrl
    ? fields.highlightThumbnailUrl
    : fields.imageUrl;

  const imgSrc = useMemo(() => {
    const base = toApiUrl(posterSourceUrl);
    if (!base || !cacheBust) return base;
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}cb=${encodeURIComponent(String(cacheBust))}`;
  }, [posterSourceUrl, cacheBust]);

  const publicVideoSrc = useMemo(() => {
    if (animatedActive) return toApiUrl(fields.animatedVideoUrl);
    if (highlightActive) return toApiUrl(fields.highlightVideoUrl);
    return "";
  }, [animatedActive, highlightActive, fields.animatedVideoUrl, fields.highlightVideoUrl]);

  useEffect(() => {
    if (!useOwnerVideoProxy || !token || !cardIdForApi || !fields.animatedVideoUrl || !animatedActive) {
      setOwnerVideoBlobUrl(null);
      return undefined;
    }

    let cancelled = false;
    let objectUrl = null;

    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/cards/${encodeURIComponent(cardIdForApi)}/video`, {
          headers: { ...authHeaders(token) },
        });
        if (!res.ok) throw new Error("video fetch failed");
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setOwnerVideoBlobUrl(objectUrl);
      } catch {
        if (!cancelled) {
          setOwnerVideoBlobUrl(null);
          setVideoFailed(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [useOwnerVideoProxy, token, cardIdForApi, fields.animatedVideoUrl, animatedActive]);

  const videoSrc = animatedActive && useOwnerVideoProxy ? ownerVideoBlobUrl : publicVideoSrc;
  const videoReady = hasVideo && (!useOwnerVideoProxy || !animatedActive || Boolean(ownerVideoBlobUrl));

  const trimStart = Number(fields.highlightTrimStart ?? 0);
  const trimEnd = Number(fields.highlightTrimEnd ?? 0);

  const browseActive = isGridBrowse && (isMobile ? mobileActive : hovered);

  const shouldPlayVideo =
    videoReady &&
    (isGridBrowse ? browseActive : forcePlay || (!playOnHover && !isGridBrowse));

  const showStaticPoster = Boolean(imgSrc && !imgFailed);
  const showVideoLayer = videoReady && shouldPlayVideo;
  const showPosterImage = showStaticPoster && (!isDetail || !showVideoLayer);

  const videoMuted = highlightActive && isDetail ? highlightMuted : true;

  const protectedMediaClass = protectMedia ? "card-media-protected" : "";
  const imgClass = [CARD_IMAGE_MEDIA_CLASS, protectedMediaClass, className].filter(Boolean).join(" ");
  const videoClass = [CARD_VIDEO_CLASS, protectedMediaClass, className].filter(Boolean).join(" ");

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoReady) return;
    if (shouldPlayVideo && videoSrc) {
      el.play().catch(() => {});
    } else {
      el.pause();
      try {
        el.currentTime = highlightActive && needsTrimPlayback ? trimStart : 0;
      } catch {
        /* ignore */
      }
    }
  }, [shouldPlayVideo, videoReady, videoSrc, highlightActive, needsTrimPlayback, trimStart]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !highlightActive || !shouldPlayVideo) return undefined;

    const onLoadedMetadata = () => {
      const duration = Number(el.duration) || 0;
      const hasTrim = trimEnd > trimStart;
      setNeedsTrimPlayback(hasTrim);
      if (hasTrim) {
        try {
          el.currentTime = trimStart;
        } catch {
          /* ignore */
        }
      } else if (duration > 0) {
        setNeedsTrimPlayback(false);
      }
    };

    const onTimeUpdate = () => {
      if (!needsTrimPlayback) return;
      if (el.currentTime >= trimEnd - 0.05) {
        try {
          el.currentTime = trimStart;
        } catch {
          /* ignore */
        }
        el.play().catch(() => {});
      }
    };

    el.addEventListener("loadedmetadata", onLoadedMetadata);
    el.addEventListener("timeupdate", onTimeUpdate);
    if (el.readyState >= 1) onLoadedMetadata();

    return () => {
      el.removeEventListener("loadedmetadata", onLoadedMetadata);
      el.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [highlightActive, shouldPlayVideo, trimStart, trimEnd, needsTrimPlayback, videoSrc]);

  const mediaProtectionProps = protectMedia
    ? {
        draggable: false,
        onContextMenu: (e) => e.preventDefault(),
      }
    : {};

  const displaySize =
    infoBannerVariant === "compact"
      ? "compact"
      : variant === "detail"
        ? "detail"
        : cardDisplaySizeFromFrame(frameClassName);

  const useTemplate =
    showInfoBanner !== false &&
    syntheticCard &&
    (showInfoBanner === true || syntheticCard.player_name || syntheticCard.playerName);

  const handleMobileToggle = (event) => {
    if (!isGridBrowse || !isMobile) return;
    event.preventDefault();
    event.stopPropagation();
    setMobileActive((prev) => !prev);
  };

  const videoLabel = animatedActive ? "Animated card" : "Highlight card";

  let mediaInner;
  if (!showStaticPoster && !hasVideo) {
    mediaInner = <PlaceholderInner alt={alt} />;
  } else if (isDetail && showVideoLayer && videoSrc) {
    mediaInner = (
      <ProtectedMediaShell protectMedia={protectMedia}>
        <div className={`${CARD_VIDEO_DETAIL_WRAPPER} relative`}>
          <video
            ref={videoRef}
            src={videoSrc}
            className={videoClass}
            autoPlay
            loop={!needsTrimPlayback}
            muted={videoMuted}
            playsInline
            preload="metadata"
            aria-label={alt || videoLabel}
            onError={() => setVideoFailed(true)}
            {...mediaProtectionProps}
          />
          {highlightActive ? (
            <HighlightSoundToggle muted={highlightMuted} onToggle={() => setHighlightMuted((m) => !m)} />
          ) : null}
        </div>
      </ProtectedMediaShell>
    );
  } else if (isDetail && showPosterImage) {
    mediaInner = (
      <ProtectedMediaShell protectMedia={protectMedia}>
        <img
          src={imgSrc}
          alt={alt || "Card"}
          className={imgClass}
          loading="lazy"
          decoding="async"
          onError={() => setImgFailed(true)}
          {...mediaProtectionProps}
        />
      </ProtectedMediaShell>
    );
  } else {
    mediaInner = (
      <>
        {showPosterImage ? (
          <ProtectedMediaShell protectMedia={protectMedia}>
            <img
              src={imgSrc}
              alt={alt || "Card"}
              className={`${imgClass} transition-opacity duration-200 ${
                showVideoLayer ? "opacity-0" : "opacity-100"
              }`}
              loading="lazy"
              decoding="async"
              onError={() => setImgFailed(true)}
              {...mediaProtectionProps}
            />
          </ProtectedMediaShell>
        ) : null}
        {hasVideo && showVideoLayer && videoSrc ? (
          <div className={CARD_VIDEO_WRAPPER_OVERLAY} aria-hidden={false}>
            <ProtectedMediaShell protectMedia={protectMedia}>
              <video
                ref={videoRef}
                src={videoSrc}
                className={videoClass}
                loop={!needsTrimPlayback}
                muted
                playsInline
                preload="auto"
                aria-label={alt || videoLabel}
                onError={() => setVideoFailed(true)}
                {...mediaProtectionProps}
              />
            </ProtectedMediaShell>
          </div>
        ) : null}
      </>
    );
  }

  const mediaSlot = (
    <div
      className="relative h-full w-full"
      onMouseEnter={isGridBrowse && !isMobile ? () => setHovered(true) : undefined}
      onMouseLeave={
        isGridBrowse && !isMobile
          ? () => {
              setHovered(false);
            }
          : undefined
      }
      onClick={handleMobileToggle}
    >
      {mediaInner}
    </div>
  );

  const progressLabel = isHighlightInProgress(fields)
    ? "Highlight processing..."
    : "Animation in progress...";
  const progressTone = isHighlightInProgress(fields)
    ? "border-[#D85A30]/40 bg-[#D85A30]/20 text-orange-100"
    : "border-violet-400/40 bg-violet-500/20 text-violet-100";

  if (useTemplate) {
    return (
      <CardDisplay
        card={syntheticCard}
        size={displaySize}
        className={frameClassName}
        showAnimatedBadge={showAnimatedBadge && animatedActive}
        showHighlightBadge={showHighlightBadge && highlightActive}
        inProgressOverlay={inProgress}
        inProgressLabel={progressLabel}
        inProgressTone={progressTone}
      >
        {mediaSlot}
      </CardDisplay>
    );
  }

  return (
    <div className={`relative h-full w-full overflow-hidden ${frameClassName}`}>
      {mediaSlot}
      {inProgress ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 backdrop-blur-[2px]">
          <span className={`animate-pulse rounded-lg border px-3 py-2 text-xs font-semibold ${progressTone}`}>
            {progressLabel}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function PlaceholderInner({ alt }) {
  return (
    <div
      className="flex h-full min-h-[80px] w-full flex-col items-center justify-center gap-2 bg-slate-900/90 p-4 text-center text-slate-400"
      role="img"
      aria-label={alt || "Card preview unavailable"}
    >
      <span className="text-2xl opacity-50" aria-hidden>
        ?
      </span>
      <p className="text-xs leading-snug">Image file missing (often after a deploy without persistent disk).</p>
    </div>
  );
}
