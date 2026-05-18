import React, { useEffect, useMemo, useRef, useState } from "react";
import { toApiUrl } from "../config/api";
import { isAnimatedCard, isAnimationInProgress } from "../utils/animationCard";
import { useIsMobileViewport } from "../hooks/usePrefersReducedMotion";
import AnimatedBadge from "./AnimatedBadge";

const IMG_BASE = "block h-auto w-full object-contain";

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
}) {
  const [failed, setFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const videoRef = useRef(null);
  const isMobile = useIsMobileViewport();

  const fields = resolveCardFields(card, {
    imageUrl,
    animatedVideoUrl,
    isAnimated: isAnimatedProp,
    animationStatus,
  });

  const showVideo =
    isAnimatedCard(fields) && fields.animatedVideoUrl && !videoFailed && !isAnimationInProgress(fields);
  const inProgress = showInProgressOverlay && isAnimationInProgress(fields);

  const imgSrc = useMemo(() => {
    const base = toApiUrl(fields.imageUrl);
    if (!base || !cacheBust) return base;
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}cb=${encodeURIComponent(String(cacheBust))}`;
  }, [fields.imageUrl, cacheBust]);

  const videoSrc = useMemo(() => toApiUrl(fields.animatedVideoUrl), [fields.animatedVideoUrl]);

  const shouldPlayVideo = showVideo && (forcePlay || isMobile || !playOnHover || hovered);

  const imgClass = [IMG_BASE, className].filter(Boolean).join(" ");

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !showVideo) return;
    if (shouldPlayVideo) {
      el.play().catch(() => {});
    } else {
      el.pause();
      try {
        el.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
  }, [shouldPlayVideo, showVideo, videoSrc]);

  let content;
  if (showVideo) {
    content = (
      <video
        ref={videoRef}
        src={videoSrc}
        className={imgClass}
        autoPlay={shouldPlayVideo}
        loop
        muted
        playsInline
        preload="metadata"
        aria-label={alt || "Animated card"}
        onError={() => setVideoFailed(true)}
      />
    );
  } else if (failed || !imgSrc) {
    content = <PlaceholderInner alt={alt} className={className} />;
  } else {
    content = (
      <img
        src={imgSrc}
        alt={alt || "Card"}
        className={imgClass}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }

  const media = (
    <div
      className="relative h-full w-full"
      onMouseEnter={playOnHover && !isMobile ? () => setHovered(true) : undefined}
      onMouseLeave={playOnHover && !isMobile ? () => setHovered(false) : undefined}
    >
      {content}
      {showAnimatedBadge && showVideo ? (
        <span className="absolute right-2 top-2 z-10">
          <AnimatedBadge />
        </span>
      ) : null}
      {inProgress ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 backdrop-blur-[2px]">
          <span className="animate-pulse rounded-lg border border-violet-400/40 bg-violet-500/20 px-3 py-2 text-xs font-semibold text-violet-100">
            Animation in progress...
          </span>
        </div>
      ) : null}
    </div>
  );

  if (frameClassName) {
    return <div className={frameClassName}>{media}</div>;
  }
  return media;
}

function PlaceholderInner({ alt, className }) {
  return (
    <div
      className={`flex min-h-[120px] flex-col items-center justify-center gap-2 bg-slate-900/90 p-4 text-center text-slate-400 ${className}`}
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
