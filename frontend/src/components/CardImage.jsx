import React, { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL, authHeaders, toApiUrl } from "../config/api";
import {
  CARD_IMAGE_FRAME,
  CARD_IMAGE_FRAME_ANIMATED,
  CARD_IMAGE_MEDIA_CLASS,
  CARD_MEDIA_SLOT,
  CARD_MEDIA_SLOT_DETAIL,
  CARD_VIDEO_CLASS,
  CARD_VIDEO_DETAIL_WRAPPER,
  CARD_VIDEO_WRAPPER_OVERLAY,
} from "../utils/cardImageStyles";
import { isAnimatedCard, isAnimationInProgress } from "../utils/animationCard";
import { useIsMobileViewport } from "../hooks/usePrefersReducedMotion";
import AnimatedBadge from "./AnimatedBadge";
import CardInfoBanner from "./CardInfoBanner";

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

/** Renders static or animated card media; single place for video/img logic app-wide */
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
  const [ownerVideoLoading, setOwnerVideoLoading] = useState(false);
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
      setOwnerVideoLoading(false);
      return undefined;
    }

    let cancelled = false;
    let objectUrl = null;
    setOwnerVideoLoading(true);
    setVideoFailed(false);

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
      } finally {
        if (!cancelled) setOwnerVideoLoading(false);
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
  // Show PNG whenever available; hide on detail only while video is actively playing
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

  const resolvedFrame =
    frameClassName ||
    (variant === "grid"
      ? hasVideo
        ? CARD_IMAGE_FRAME_ANIMATED
        : CARD_IMAGE_FRAME
      : "");

  const shouldShowBanner =
    showInfoBanner !== false &&
    (showInfoBanner === true || (card && (card.player_name || card.playerName)));

  const frameClass = shouldShowBanner
    ? [resolvedFrame, resolvedFrame ? "rounded-b-none border-b-0" : ""].filter(Boolean).join(" ")
    : resolvedFrame;

  const mediaProtectionProps = protectMedia
    ? {
        draggable: false,
        onContextMenu: (e) => e.preventDefault(),
      }
    : {};

  let inner;
  if (!showStaticPoster && !hasVideo) {
    inner = <PlaceholderInner alt={alt} className={className} isDetail={isDetail} />;
  } else if (isDetail && showVideoLayer && videoSrc) {
    inner = (
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
    inner = (
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
  } else if (isDetail) {
    inner = null;
  } else {
    inner = (
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

  const media = (
    <div
      className={isDetail ? CARD_MEDIA_SLOT_DETAIL : CARD_MEDIA_SLOT}
      onMouseEnter={isGridBrowse && !isMobile ? () => setHovered(true) : undefined}
      onMouseLeave={isGridBrowse && !isMobile ? () => setHovered(false) : undefined}
    >
      {inner}
      {showAnimatedBadge && hasVideo ? (
        <span className="absolute right-2 top-2 z-10">
          <AnimatedBadge />
        </span>
      ) : null}
      {inProgress ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center overflow-hidden rounded-[inherit] bg-black/55 backdrop-blur-[2px]">
          <span className="animate-pulse rounded-lg border border-violet-400/40 bg-violet-500/20 px-3 py-2 text-xs font-semibold text-violet-100">
            Animation in progress...
          </span>
        </div>
      ) : null}
    </div>
  );

  const imageBlock = frameClass ? <div className={frameClass}>{media}</div> : media;

  if (shouldShowBanner) {
    return (
      <div className="flex w-full min-w-0 flex-col overflow-hidden rounded-[inherit]">
        {imageBlock}
        <CardInfoBanner card={card} variant={infoBannerVariant} />
      </div>
    );
  }

  return imageBlock;
}

function PlaceholderInner({ alt, className, isDetail }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 bg-slate-900/90 p-4 text-center text-slate-400 ${
        isDetail ? "min-h-[200px] w-full" : "min-h-[120px]"
      } ${className}`}
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
