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
import {
  highlightVideoUrl,
  isHighlightCard,
  isHighlightInProgress,
  isHighlightType,
} from "../utils/highlightCard";
import { useIsMobileViewport } from "../hooks/usePrefersReducedMotion";
import CardDisplay from "./CardDisplay";
import HighlightVideoPlayer from "./HighlightVideoPlayer";

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

function HighlightProcessingPlaceholder() {
  return (
    <div className="flex h-full min-h-[80px] w-full flex-col items-center justify-center gap-2 bg-gradient-to-b from-slate-900 to-slate-950 p-4 text-center">
      <span className="text-xl opacity-60" aria-hidden>
        ▶
      </span>
      <p className="text-xs text-slate-400">Video processing…</p>
    </div>
  );
}

/** Renders card media inside the fixed CardDisplay template app-wide */
export default function CardImage({
  card,
  imageUrl,
  animatedVideoUrl,
  highlightVideoUrl: highlightVideoUrlProp,
  highlightThumbnailUrl,
  localHighlightVideoUrl = "",
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
  const videoRef = useRef(null);
  const isMobile = useIsMobileViewport();
  const isDetail = variant === "detail";
  const isGridBrowse = variant === "grid" && playOnHover;
  const cardIdForApi = card?.card_id || "";

  const fields = resolveCardFields(card, {
    imageUrl,
    animatedVideoUrl,
    highlightVideoUrl: highlightVideoUrlProp,
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

  const localVideo = localHighlightVideoUrl || "";
  const highlightSrc = useMemo(() => {
    if (localVideo) return localVideo;
    const url = highlightVideoUrl(cardForTypeChecks, "") || fields.highlightVideoUrl;
    return url ? toApiUrl(url) : "";
  }, [localVideo, cardForTypeChecks, fields.highlightVideoUrl]);

  const animatedActive =
    isAnimatedCard({ ...cardForTypeChecks, ...fields }) &&
    fields.animatedVideoUrl &&
    !isAnimationInProgress(fields);

  const highlightActive =
    !animatedActive &&
    Boolean(highlightSrc) &&
    !videoFailed &&
    (isHighlightCard({ ...cardForTypeChecks, ...fields }, { localVideoUrl: localVideo }) ||
      isHighlightType(cardForTypeChecks) ||
      Boolean(localVideo));

  const highlightMissingVideo =
    !animatedActive &&
    isHighlightType(cardForTypeChecks) &&
    !highlightSrc &&
    !isHighlightInProgress({ ...cardForTypeChecks, ...fields });

  const hasVideo = (animatedActive || highlightActive) && !videoFailed;
  const inProgress =
    showInProgressOverlay &&
    (isAnimationInProgress(fields) || isHighlightInProgress({ ...cardForTypeChecks, ...fields }));

  const imgSrc = useMemo(() => {
    const posterSourceUrl =
      highlightActive && fields.highlightThumbnailUrl
        ? fields.highlightThumbnailUrl
        : fields.imageUrl;
    const base = toApiUrl(posterSourceUrl);
    if (!base || !cacheBust) return base;
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}cb=${encodeURIComponent(String(cacheBust))}`;
  }, [fields.imageUrl, fields.highlightThumbnailUrl, highlightActive, cacheBust]);

  const publicVideoSrc = useMemo(() => {
    if (animatedActive) return toApiUrl(fields.animatedVideoUrl);
    if (highlightActive) return highlightSrc;
    return "";
  }, [animatedActive, highlightActive, fields.animatedVideoUrl, highlightSrc]);

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

  const trimStart = Number(fields.highlightTrimStart ?? highlightTrimStart ?? 0);
  const trimEndRaw = fields.highlightTrimEnd ?? highlightTrimEnd;
  const trimEnd = trimEndRaw != null && trimEndRaw !== "" ? Number(trimEndRaw) : null;

  const browseActive = isGridBrowse && (isMobile ? mobileActive : hovered);

  const shouldPlayVideo =
    videoReady &&
    (highlightActive
      ? isDetail
        ? forcePlay || true
        : isGridBrowse
          ? browseActive
          : forcePlay || !playOnHover
      : isGridBrowse
        ? browseActive
        : forcePlay || (!playOnHover && !isGridBrowse));

  const highlightPlaying = highlightActive && shouldPlayVideo;

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoReady || highlightActive) return;
    if (shouldPlayVideo && videoSrc) {
      el.play().catch(() => {});
    } else {
      el.pause();
      try {
        el.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
  }, [shouldPlayVideo, videoReady, videoSrc, highlightActive]);

  const showStaticPoster = Boolean(imgSrc && !imgFailed) && !highlightActive;
  const showVideoLayer = videoReady && (highlightActive || shouldPlayVideo);
  const showHighlightVideoFrame = highlightActive && videoSrc;
  const showPosterImage = showStaticPoster && (!isDetail || !showVideoLayer);

  const videoMuted = highlightActive && isDetail ? highlightMuted : true;

  const protectedMediaClass = protectMedia ? "card-media-protected" : "";
  const imgClass = [CARD_IMAGE_MEDIA_CLASS, protectedMediaClass, className].filter(Boolean).join(" ");
  const videoClass = [CARD_VIDEO_CLASS, protectedMediaClass, className].filter(Boolean).join(" ");

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

  const renderHighlightVideo = (wrapperClass = "") => (
    <ProtectedMediaShell protectMedia={protectMedia}>
      <HighlightVideoPlayer
        videoSrc={videoSrc}
        playing={highlightPlaying}
        trimStart={trimStart}
        trimEnd={trimEnd}
        muted={videoMuted}
        autoPlay={highlightPlaying && isDetail}
        wrapperClass={wrapperClass || CARD_VIDEO_DETAIL_WRAPPER}
        ariaLabel={alt || videoLabel}
        onError={() => setVideoFailed(true)}
        mediaProtectionProps={mediaProtectionProps}
        showSoundToggle={isDetail}
        soundMuted={highlightMuted}
        onToggleSound={() => setHighlightMuted((m) => !m)}
      />
    </ProtectedMediaShell>
  );

  let mediaInner;
  if (highlightMissingVideo) {
    mediaInner = <HighlightProcessingPlaceholder />;
  } else if (!showStaticPoster && !hasVideo && !highlightActive) {
    mediaInner = <PlaceholderInner alt={alt} />;
  } else if (highlightActive && showHighlightVideoFrame) {
    mediaInner = renderHighlightVideo(isDetail ? CARD_VIDEO_DETAIL_WRAPPER : CARD_VIDEO_WRAPPER_OVERLAY);
  } else if (isDetail && showVideoLayer && videoSrc) {
    mediaInner = (
      <ProtectedMediaShell protectMedia={protectMedia}>
        <div className={`${CARD_VIDEO_DETAIL_WRAPPER} relative`}>
          <video
            ref={videoRef}
            src={videoSrc}
            className={videoClass}
            autoPlay
            loop
            muted={videoMuted}
            playsInline
            preload="metadata"
            aria-label={alt || videoLabel}
            onError={() => setVideoFailed(true)}
            {...mediaProtectionProps}
          />
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
                showVideoLayer && !highlightActive ? "opacity-0" : "opacity-100"
              }`}
              loading="lazy"
              decoding="async"
              onError={() => setImgFailed(true)}
              {...mediaProtectionProps}
            />
          </ProtectedMediaShell>
        ) : null}
        {hasVideo && showVideoLayer && videoSrc && !highlightActive ? (
          <div className={CARD_VIDEO_WRAPPER_OVERLAY} aria-hidden={false}>
            <ProtectedMediaShell protectMedia={protectMedia}>
              <video
                ref={videoRef}
                src={videoSrc}
                className={videoClass}
                loop
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

  const progressLabel = isHighlightInProgress({ ...cardForTypeChecks, ...fields })
    ? "Highlight processing..."
    : "Animation in progress...";
  const progressTone = isHighlightInProgress({ ...cardForTypeChecks, ...fields })
    ? "border-[#D85A30]/40 bg-[#D85A30]/20 text-orange-100"
    : "border-violet-400/40 bg-violet-500/20 text-violet-100";

  const showBadge =
    showHighlightBadge &&
    (highlightActive || isHighlightType(cardForTypeChecks) || Boolean(localVideo));

  if (useTemplate) {
    const useHighlightShell =
      showBadge ||
      highlightActive ||
      isHighlightType(cardForTypeChecks) ||
      Boolean(localVideo);

    return (
      <CardDisplay
        card={syntheticCard}
        size={displaySize}
        className={frameClassName}
        showAnimatedBadge={showAnimatedBadge && animatedActive}
        showHighlightBadge={showBadge}
        isHighlight={useHighlightShell}
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
