import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL, authHeaders, toApiUrl } from "../config/api";
import {
  CARD_IMAGE_MEDIA_CLASS,
  CARD_IMAGE_MEDIA_DETAIL,
  CARD_VIDEO_CLASS,
  CARD_VIDEO_DETAIL_WRAPPER,
  CARD_VIDEO_WRAPPER_OVERLAY,
} from "../utils/cardImageStyles";
import { isAnimatedCard, isAnimationInProgress } from "../utils/animationCard";
import {
  highlightVideoUrl,
  isHighlightCard,
  isHighlightInProgress,
  isHighlightType,
} from "../utils/highlightCard";
import { usePrefersHover } from "../hooks/usePrefersReducedMotion";
import { useSettings } from "../context/SettingsContext";
import { normalizeCardForDisplay } from "../utils/cardDetailUtils";
import CardDisplay from "./CardDisplay";
import HighlightVideoPlayer from "./HighlightVideoPlayer";
import ThemedStaticPoster from "./ThemedStaticPoster";

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
      playerPhotoUrl: card.player_photo_url ?? props.playerPhotoUrl,
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
    playerPhotoUrl: props.playerPhotoUrl,
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
  if (card && typeof card === "object") return normalizeCardForDisplay(card);
  if (!imageUrl) return null;
  return normalizeCardForDisplay({ image_url: imageUrl, player_name: "Player" });
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

function HighlightVideoUnavailable({ posterSrc, alt }) {
  return (
    <div className="flex h-full min-h-[80px] w-full flex-col items-center justify-center gap-2 bg-gradient-to-b from-slate-900 to-slate-950 p-4 text-center">
      {posterSrc ? (
        <img
          src={posterSrc}
          alt={alt || "Card"}
          className="mb-2 max-h-[45%] max-w-full rounded object-contain opacity-80"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className="text-xl opacity-50" aria-hidden>
          ▶
        </span>
      )}
      <p className="text-xs text-slate-400">Video unavailable</p>
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
  showRarityBadge = true,
  animateSignature = false,
  showInProgressOverlay = true,
  showInfoBanner,
  infoBannerVariant = "default",
  variant = "grid",
  protectMedia = false,
  useOwnerVideoProxy = false,
  token = "",
  captureRef = null,
  onMediaReady,
}) {
  const { settings } = useSettings();
  const autoplayEnabled = settings.autoplay_videos !== false;
  const effectivePlayOnHover = playOnHover && autoplayEnabled;

  const [imgFailed, setImgFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [mobileActive, setMobileActive] = useState(false);
  const [viewportActive, setViewportActive] = useState(false);
  const [ownerVideoBlobUrl, setOwnerVideoBlobUrl] = useState(null);
  const [highlightMuted, setHighlightMuted] = useState(true);
  const [animatedMuted, setAnimatedMuted] = useState(true);
  const videoRef = useRef(null);
  const mediaContainerRef = useRef(null);
  const mediaReadyFiredRef = useRef(false);
  const canHover = usePrefersHover();
  const isDetail = variant === "detail";
  const isGridBrowse = variant === "grid" && effectivePlayOnHover;
  const cardIdForApi = card?.card_id || card?.cardId || "";

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
  const highlightUrlPath =
    highlightVideoUrl(cardForTypeChecks, "") || fields.highlightVideoUrl || "";

  const highlightSrc = useMemo(() => {
    if (localVideo) return localVideo;
    return highlightUrlPath ? toApiUrl(highlightUrlPath) : "";
  }, [localVideo, highlightUrlPath, cardIdForApi]);

  const animatedActive =
    isAnimatedCard({ ...cardForTypeChecks, ...fields }) &&
    fields.animatedVideoUrl &&
    !isAnimationInProgress(fields);

  const isAnimatedType = Boolean(
    cardForTypeChecks?.is_animated ?? fields.isAnimated ?? isAnimatedProp
  );

  const useThemedAnimatedMedia = isAnimatedType;

  const highlightActive =
    !animatedActive &&
    Boolean(highlightSrc) &&
    !videoFailed &&
    (isHighlightCard({ ...cardForTypeChecks, ...fields }, { localVideoUrl: localVideo }) ||
      isHighlightType(cardForTypeChecks) ||
      Boolean(localVideo));

  const highlightInProgress = isHighlightInProgress({ ...cardForTypeChecks, ...fields });

  const highlightMissingVideo =
    !animatedActive && isHighlightType(cardForTypeChecks) && !highlightSrc && highlightInProgress;

  const highlightVideoUnavailable =
    !animatedActive && isHighlightType(cardForTypeChecks) && !highlightSrc && !highlightInProgress;

  const hasVideo = (animatedActive || highlightActive) && !videoFailed;
  const inProgress =
    showInProgressOverlay &&
    (isAnimationInProgress(fields) || isHighlightInProgress({ ...cardForTypeChecks, ...fields }));

  const imgSrc = useMemo(() => {
    const posterSourceUrl =
      highlightActive && fields.highlightThumbnailUrl
        ? fields.highlightThumbnailUrl
        : useThemedAnimatedMedia && fields.playerPhotoUrl
          ? fields.playerPhotoUrl
          : fields.imageUrl;
    return toApiUrl(posterSourceUrl);
  }, [
    fields.imageUrl,
    fields.highlightThumbnailUrl,
    fields.playerPhotoUrl,
    highlightActive,
    useThemedAnimatedMedia,
  ]);

  const publicVideoSrc = useMemo(() => {
    if (animatedActive) return toApiUrl(fields.animatedVideoUrl);
    if (highlightActive) return highlightSrc;
    return "";
  }, [animatedActive, highlightActive, fields.animatedVideoUrl, highlightSrc]);

  const ownerProxyNeeded =
    useOwnerVideoProxy &&
    animatedActive &&
    Boolean(fields.animatedVideoUrl) &&
    !/^https?:\/\//i.test(String(fields.animatedVideoUrl));

  useEffect(() => {
    if (!ownerProxyNeeded || !token || !cardIdForApi || !fields.animatedVideoUrl) {
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
  }, [ownerProxyNeeded, token, cardIdForApi, fields.animatedVideoUrl]);

  const videoSrc = ownerProxyNeeded ? ownerVideoBlobUrl : publicVideoSrc;
  const videoReady = hasVideo && (!ownerProxyNeeded || Boolean(ownerVideoBlobUrl));

  const trimStart = Number(fields.highlightTrimStart ?? highlightTrimStart ?? 0) || 0;
  const trimEndRaw = fields.highlightTrimEnd ?? highlightTrimEnd ?? null;
  const trimEndParsed =
    trimEndRaw != null && trimEndRaw !== "" ? Number(trimEndRaw) : null;
  const trimEnd =
    trimEndParsed != null && Number.isFinite(trimEndParsed) ? trimEndParsed : null;

  const handleHighlightVideoError = useCallback(() => setVideoFailed(true), []);
  const handleToggleHighlightSound = useCallback(() => setHighlightMuted((m) => !m), []);
  const handleToggleAnimatedSound = useCallback(() => setAnimatedMuted((m) => !m), []);

  const notifyMediaReady = useCallback(() => {
    if (mediaReadyFiredRef.current) return;
    mediaReadyFiredRef.current = true;
    onMediaReady?.();
  }, [onMediaReady]);

  useEffect(() => {
    mediaReadyFiredRef.current = false;
  }, [imgSrc, videoSrc, highlightSrc, onMediaReady]);

  const handleImageLoad = useCallback(() => {
    notifyMediaReady();
  }, [notifyMediaReady]);

  const handleImageError = useCallback((event) => {
    const target = event.target;
    if (!target?.dataset?.retried) {
      target.dataset.retried = "true";
      window.setTimeout(() => {
        const src = target.src;
        target.src = "";
        target.src = src;
      }, 500);
      return;
    }
    setImgFailed(true);
  }, []);

  const useViewportAutoplay = isGridBrowse && !canHover && hasVideo;
  const browseActive =
    isGridBrowse && (canHover ? hovered : useViewportAutoplay ? viewportActive : mobileActive);

  useEffect(() => {
    if (!useViewportAutoplay) {
      setViewportActive(false);
      return undefined;
    }
    const el = mediaContainerRef.current;
    if (!el) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setViewportActive(entry.isIntersecting);
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [useViewportAutoplay, videoReady, highlightActive, animatedActive]);

  const shouldPlayVideo =
    videoReady &&
    (animatedActive && isDetail
      ? true
      : highlightActive
        ? isDetail
          ? forcePlay || true
          : isGridBrowse
            ? browseActive
            : forcePlay || !effectivePlayOnHover
        : isGridBrowse
          ? browseActive
          : forcePlay || (!effectivePlayOnHover && !isGridBrowse));

  const highlightPlaying = highlightActive && shouldPlayVideo;

  useEffect(() => {
    if (onMediaReady && shouldPlayVideo && videoReady) {
      notifyMediaReady();
    }
  }, [onMediaReady, shouldPlayVideo, videoReady, notifyMediaReady]);

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

  const videoMuted =
    highlightActive && isDetail ? highlightMuted : animatedActive && isDetail ? animatedMuted : true;

  const protectedMediaClass = protectMedia ? "card-media-protected" : "";
  const imgClass = [
    isDetail ? CARD_IMAGE_MEDIA_DETAIL : CARD_IMAGE_MEDIA_CLASS,
    protectedMediaClass,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const videoClass = [CARD_VIDEO_CLASS, protectedMediaClass, className].filter(Boolean).join(" ");

  const mediaProtectionProps = useMemo(
    () =>
      protectMedia
        ? {
            draggable: false,
            onContextMenu: (e) => e.preventDefault(),
          }
        : {},
    [protectMedia]
  );

  const displaySize =
    variant === "detail"
      ? "detail"
      : infoBannerVariant === "thumb"
        ? "thumb"
        : infoBannerVariant === "compact"
          ? "compact"
          : "default";

  const useTemplate =
    showInfoBanner !== false &&
    syntheticCard &&
    (showInfoBanner === true || syntheticCard.player_name || syntheticCard.playerName);

  const handleMobileToggle = (event) => {
    if (!isGridBrowse || canHover || useViewportAutoplay) return;
    event.preventDefault();
    event.stopPropagation();
    setMobileActive((prev) => !prev);
  };

  const videoLabel = animatedActive ? "Animated card" : "Highlight card";

  const cardTheme =
    cardForTypeChecks?.theme ??
    cardForTypeChecks?.special_theme ??
    cardForTypeChecks?.specialTheme ??
    "";
  const cardTier = cardForTypeChecks?.tier ?? cardForTypeChecks?.card_tier ?? "rookie";
  const highlightTintScale = isDetail ? 1 : 0.7;

  const frameVideoSrc = animatedActive ? videoSrc : highlightSrc;
  const frameVideoPlaying = animatedActive ? shouldPlayVideo : highlightPlaying;
  const frameVideoKey = animatedActive
    ? `animated-${cardIdForApi || "card"}`
    : `highlight-${cardIdForApi || "card"}`;

  const frameVideoElement = useMemo(() => {
    const activeSrc = animatedActive ? videoSrc : highlightSrc;
    if (!(animatedActive || highlightActive) || !activeSrc) return null;
    return (
      <ProtectedMediaShell protectMedia={protectMedia}>
        <HighlightVideoPlayer
          videoSrc={activeSrc}
          videoKey={frameVideoKey}
          theme={cardTheme}
          tier={cardTier}
          tintOpacityScale={highlightTintScale}
          playing={frameVideoPlaying}
          trimStart={animatedActive ? 0 : trimStart}
          trimEnd={animatedActive ? null : trimEnd}
          muted={videoMuted}
          autoPlay={frameVideoPlaying && isDetail}
          wrapperClass={isDetail ? CARD_VIDEO_DETAIL_WRAPPER : CARD_VIDEO_WRAPPER_OVERLAY}
          ariaLabel={alt || videoLabel}
          onError={animatedActive ? () => setVideoFailed(true) : handleHighlightVideoError}
          mediaProtectionProps={mediaProtectionProps}
          showSoundToggle={isDetail}
          soundMuted={animatedActive ? animatedMuted : highlightMuted}
          onToggleSound={animatedActive ? handleToggleAnimatedSound : handleToggleHighlightSound}
          objectFit={animatedActive ? "cover" : "contain"}
          soundTogglePosition={animatedActive ? "right" : "left"}
        />
      </ProtectedMediaShell>
    );
  }, [
    animatedActive,
    highlightActive,
    videoSrc,
    highlightSrc,
    frameVideoKey,
    cardTheme,
    cardTier,
    highlightTintScale,
    frameVideoPlaying,
    trimStart,
    trimEnd,
    videoMuted,
    isDetail,
    alt,
    videoLabel,
    handleHighlightVideoError,
    handleToggleHighlightSound,
    handleToggleAnimatedSound,
    highlightMuted,
    animatedMuted,
    protectMedia,
    mediaProtectionProps,
  ]);

  const themedPosterElement = useMemo(() => {
    if (!useThemedAnimatedMedia || !imgSrc) return null;
    return (
      <ProtectedMediaShell protectMedia={protectMedia}>
        <ThemedStaticPoster
          src={imgSrc}
          theme={cardTheme}
          tier={cardTier}
          tintOpacityScale={highlightTintScale}
          objectFit="cover"
          wrapperClass={isDetail ? CARD_VIDEO_DETAIL_WRAPPER : ""}
          alt={alt || "Animated card"}
          onError={handleImageError}
          mediaProtectionProps={mediaProtectionProps}
        />
      </ProtectedMediaShell>
    );
  }, [
    useThemedAnimatedMedia,
    imgSrc,
    cardTheme,
    cardTier,
    highlightTintScale,
    isDetail,
    alt,
    protectMedia,
    mediaProtectionProps,
    handleImageError,
  ]);

  let mediaInner;
  if (highlightVideoUnavailable) {
    mediaInner = <HighlightVideoUnavailable posterSrc={imgSrc} alt={alt} />;
  } else if (highlightMissingVideo) {
    mediaInner = <HighlightProcessingPlaceholder />;
  } else if (!showStaticPoster && !hasVideo && !highlightActive && !animatedActive) {
    mediaInner = <PlaceholderInner alt={alt} />;
  } else if (isDetail && animatedActive && showVideoLayer && videoSrc) {
    mediaInner = frameVideoElement;
  } else if (highlightActive && showHighlightVideoFrame) {
    mediaInner = frameVideoElement;
  } else if (isDetail && showPosterImage) {
    mediaInner =
      useThemedAnimatedMedia && themedPosterElement ? (
        themedPosterElement
      ) : (
        <ProtectedMediaShell protectMedia={protectMedia}>
          <img
            src={imgSrc}
            alt={alt || "Card"}
            className={imgClass}
            loading="lazy"
            decoding="async"
            onError={handleImageError}
            onLoad={handleImageLoad}
            {...mediaProtectionProps}
          />
        </ProtectedMediaShell>
      );
  } else {
    mediaInner = (
      <>
        {showPosterImage ? (
          useThemedAnimatedMedia && themedPosterElement ? (
            <div
              className={`h-full w-full transition-opacity duration-200 ${
                showVideoLayer && (animatedActive || highlightActive) ? "opacity-0" : "opacity-100"
              }`}
            >
              {themedPosterElement}
            </div>
          ) : (
            <ProtectedMediaShell protectMedia={protectMedia}>
              <img
                src={imgSrc}
                alt={alt || "Card"}
                className={`${imgClass} transition-opacity duration-200 ${
                  showVideoLayer && (animatedActive || highlightActive) ? "opacity-0" : "opacity-100"
                }`}
                loading="lazy"
                decoding="async"
                onError={handleImageError}
                onLoad={handleImageLoad}
                {...mediaProtectionProps}
              />
            </ProtectedMediaShell>
          )
        ) : null}
        {hasVideo && showVideoLayer && (animatedActive ? videoSrc : highlightActive && highlightSrc) ? (
          <div className={CARD_VIDEO_WRAPPER_OVERLAY} aria-hidden={false}>
            {frameVideoElement}
          </div>
        ) : null}
      </>
    );
  }

  const mediaSlot = (
    <div
      ref={mediaContainerRef}
      className="relative h-full w-full"
      onMouseEnter={isGridBrowse && canHover ? () => setHovered(true) : undefined}
      onMouseLeave={
        isGridBrowse && canHover
          ? () => {
              setHovered(false);
            }
          : undefined
      }
      onClick={isGridBrowse && !canHover && !useViewportAutoplay ? handleMobileToggle : undefined}
    >
      {mediaInner}
    </div>
  );

  const progressLabel = highlightInProgress
    ? "Highlight processing..."
    : "Animation in progress...";
  const progressTone = highlightInProgress
    ? "border-[#D85A30]/40 bg-[#D85A30]/20 text-orange-100"
    : "border-violet-400/40 bg-violet-500/20 text-violet-100";

  const showBadge =
    showHighlightBadge &&
    (highlightActive || isHighlightType(cardForTypeChecks) || Boolean(localVideo));

  if (useTemplate) {
    const useHighlightShell =
      showBadge ||
      highlightActive ||
      animatedActive ||
      isAnimatedType ||
      isHighlightType(cardForTypeChecks) ||
      Boolean(localVideo);

    return (
      <CardDisplay
        ref={captureRef}
        captureId={cardIdForApi || undefined}
        card={syntheticCard}
        size={displaySize}
        className={frameClassName}
        showAnimatedBadge={showAnimatedBadge && animatedActive}
        showHighlightBadge={showBadge}
        showRarityBadge={showRarityBadge}
        animateSignature={animateSignature}
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
      <p className="text-xs leading-snug">Image unavailable</p>
    </div>
  );
}
