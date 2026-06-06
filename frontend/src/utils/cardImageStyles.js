/** Shared card image frames — 2:3 aspect, contain fit, full card visible */

/** Grid / collection / marketplace browse tiles */
export const CARD_IMAGE_FRAME =
  "relative flex aspect-[2/3] w-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-slate-800/90 via-black/60 to-slate-900/95 p-1.5 sm:p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";

export const CARD_IMAGE_FRAME_ANIMATED =
  `${CARD_IMAGE_FRAME} ring-1 ring-violet-400/35 shadow-[0_0_28px_rgba(139,92,246,0.18)]`;

/** Inner slot — clips media to card bounds; inherits frame radius */
export const CARD_MEDIA_SLOT =
  "relative min-h-0 w-full flex-1 overflow-hidden rounded-[inherit]";

/** Detail page slot — fixed aspect frame, clip media to bounds */
export const CARD_MEDIA_SLOT_DETAIL =
  "relative h-full min-h-0 w-full flex-1 overflow-hidden rounded-[inherit]";

/** Parent wrapper for every animated <video> — overflow hidden, no hover scale */
export const CARD_VIDEO_CONTAINER = "card-animated-video-container";

/** Grid overlay: video on hover, contained within frame */
export const CARD_VIDEO_WRAPPER_OVERLAY =
  `absolute inset-0 z-[1] ${CARD_VIDEO_CONTAINER}`;

/** Detail page video wrapper */
export const CARD_VIDEO_DETAIL_WRAPPER = `relative h-full w-full min-h-0 min-w-0 ${CARD_VIDEO_CONTAINER}`;

/** Static PNG in grid/thumbnail */
export const CARD_IMAGE_MEDIA_CLASS =
  "block h-full w-full max-h-full max-w-full object-contain object-center rounded-[inherit] drop-shadow-[0_6px_20px_rgba(0,0,0,0.55)]";

/** All animated card videos — single class, contain fit only */
export const CARD_VIDEO_CLASS = "card-animated-video";

/** @deprecated use CARD_VIDEO_CLASS */
export const CARD_VIDEO_GRID_CLASS = CARD_VIDEO_CLASS;

/** @deprecated use CARD_VIDEO_CLASS */
export const CARD_VIDEO_DETAIL_CLASS = CARD_VIDEO_CLASS;

/** Detail page frame — fixed 2:3 aspect, size does not change when video plays */
export const CARD_IMAGE_FRAME_DETAIL =
  "relative mx-auto flex aspect-[2/3] w-full min-h-0 max-w-sm flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-800/80 via-black/50 to-slate-900/90 p-2 sm:max-w-md sm:p-3";

export const CARD_IMAGE_MEDIA_DETAIL = CARD_IMAGE_MEDIA_CLASS;

export const CARD_IMAGE_FRAME_SM =
  "relative flex aspect-[2/3] w-full min-h-0 max-w-[140px] flex-col overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-slate-800/90 to-black/70 p-1.5";

export const CARD_IMAGE_FRAME_XS =
  "relative flex aspect-[2/3] w-full min-h-0 max-w-[100px] flex-col overflow-hidden rounded-lg border border-white/10 bg-gradient-to-b from-slate-800/90 to-black/70 p-1";

/** Marketplace thumbnail grid — compact 2:3 tile */
export const CARD_IMAGE_FRAME_THUMB =
  "relative flex aspect-[2/3] w-full min-h-0 flex-col overflow-hidden rounded-lg border border-white/10 bg-gradient-to-b from-slate-800/90 via-black/60 to-slate-900/95 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]";

export const CARD_IMAGE_FRAME_THUMB_ANIMATED =
  `${CARD_IMAGE_FRAME_THUMB} ring-1 ring-violet-400/30 shadow-[0_0_16px_rgba(139,92,246,0.14)]`;
