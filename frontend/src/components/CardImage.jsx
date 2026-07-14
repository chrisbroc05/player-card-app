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
import { useIsMobileViewport } from "../hooks/usePrefersReducedMotion";
import CardDisplay from "./CardDisplay";

function resolveCardFields(card, props) {
  if (card && typeof card === "object") {
    return {
      imageUrl: card.image_url ?? props.imageUrl,
      animatedVideoUrl: card.animated_video_url ?? props.animatedVideoUrl,
      isAnimated: card.is_animated ?? props.isAnimated,
      animationStatus: card.animation_status ?? props.animationStatus,
    };
  }
  return {
    imageUrl: props.imageUrl,
    animatedVideoUrl: props.animatedVideoUrl,
    isAnimated: props.isAnimated,
    animationStatus: props.animationStatus,
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

/** Renders card media inside the fixed CardDisplay template app-wide */
export default function CardImage({
  card,
  imageUrl,
  animatedVideoUrl,
  isAnimated: isAnimatedProp,
  animationStatus,
  alt,
  className = "",
  frameClassName = "",
  cacheBust,
  playOnHover = false,
  forcePlay = false,
  showAnimatedBadge = true,
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
  const [ownerVideoBlobUrl, setOwnerVideoBlobUrl] = useState(null);
  const videoRef = useRef(null);
  const isMobile = useIsMobileViewport();
  const isDetail = variant === "detail";
  const isGridBrowse = variant === "grid" && playOnHover;
  const cardIdForApi = card?.card_id || "";

  const fields = resolveCardFields(card, {
    imageUrl,
    animatedVideoUrl,
    isAnimated: isAnimatedProp,
    animationStatus,
  });

  const displayCard = buildSyntheticCard(card, fields.imageUrl);
  const hasVideo =
    isAnimatedCard(fields) && fields.animatedVideoUrl && !videoFailed && !isAnimationInProgress(fields);
  const inProgress = showInProgressOverlay && isAnimationInProgress(fields);

  const imgSrc = useMemo(() => {
    const base = toApiUrl(fields.imageUrl);
    if (!base || !cacheBust) return base;
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}cb=${encodeURIComponent(String(cacheBust))}`;
  }, [fields.imageUrl, cacheBust]);

  const publicVideoSrc = useMemo(() => toApiUrl(fields.animatedVideoUrl), [fields.animatedVideoUrl]);

  useEffect(() => {
    if (!useOwnerVideoProxy || !token || !cardIdForApi || !fields.animatedVideoUrl) {
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
  }, [useOwnerVideoProxy, token, cardIdForApi, fields.animatedVideoUrl]);

  const videoSrc = useOwnerVideoProxy ? ownerVideoBlobUrl : publicVideoSrc;
  const videoReady = hasVideo && (!useOwnerVideoProxy || Boolean(ownerVideoBlobUrl));

  const shouldPlayVideo =
    videoReady &&
    (isGridBrowse ? hovered && !isMobile : forcePlay || (!playOnHover && !isGridBrowse));

  const showStaticPoster = Boolean(imgSrc && !imgFailed);
  const showVideoLayer = videoReady && shouldPlayVideo;
  const showPosterImage = showStaticPoster && (!isDetail || !showVideoLayer);

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
        el.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
  }, [shouldPlayVideo, videoReady, videoSrc]);

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
    displayCard &&
    (showInfoBanner === true || displayCard.player_name || displayCard.playerName);

  let mediaInner;
  if (!showStaticPoster && !hasVideo) {
    mediaInner = <PlaceholderInner alt={alt} />;
  } else if (isDetail && showVideoLayer && videoSrc) {
    mediaInner = (
      <ProtectedMediaShell protectMedia={protectMedia}>
        <div className={CARD_VIDEO_DETAIL_WRAPPER}>
          <video
            ref={videoRef}
            src={videoSrc}
            className={videoClass}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            aria-label={alt || "Animated card"}
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
                loop
                muted
                playsInline
                preload="auto"
                aria-label={alt || "Animated card"}
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
      onMouseLeave={isGridBrowse && !isMobile ? () => setHovered(false) : undefined}
    >
      {mediaInner}
    </div>
  );

  if (useTemplate) {
    return (
      <CardDisplay
        card={displayCard}
        size={displaySize}
        className={frameClassName}
        showAnimatedBadge={showAnimatedBadge && hasVideo}
        inProgressOverlay={inProgress}
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
          <span className="animate-pulse rounded-lg border border-violet-400/40 bg-violet-500/20 px-3 py-2 text-xs font-semibold text-violet-100">
            Animation in progress...
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
