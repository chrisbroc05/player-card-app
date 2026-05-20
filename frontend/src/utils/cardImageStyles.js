/** Shared card image frames — 2:3 aspect, contain fit, full card visible */

/** Grid / collection / marketplace browse tiles */
export const CARD_IMAGE_FRAME =
  "relative flex aspect-[2/3] w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-slate-800/90 via-black/60 to-slate-900/95 p-1.5 sm:p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";

export const CARD_IMAGE_FRAME_ANIMATED =
  `${CARD_IMAGE_FRAME} ring-1 ring-violet-400/35 shadow-[0_0_28px_rgba(139,92,246,0.18)]`;

/** Inner slot — clips media to card bounds; inherits frame radius */
export const CARD_MEDIA_SLOT =
  "relative h-full w-full overflow-hidden rounded-[inherit]";

/** Static PNG in grid/thumbnail */
export const CARD_IMAGE_MEDIA_CLASS =
  "block h-full w-full max-h-full max-w-full object-contain object-center rounded-[inherit] drop-shadow-[0_6px_20px_rgba(0,0,0,0.55)]";

/** Grid hover video — centered inside slot, never crops */
export const CARD_VIDEO_GRID_CLASS = "card-animated-video";

/** Detail page video — full portrait card, no crop */
export const CARD_VIDEO_DETAIL_CLASS = "card-animated-video-detail";

/** Detail page frame — no forced aspect; video uses 5:7 */
export const CARD_IMAGE_FRAME_DETAIL =
  "relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-800/80 via-black/50 to-slate-900/90 p-2 sm:max-w-md sm:p-3";

export const CARD_IMAGE_MEDIA_DETAIL = CARD_IMAGE_MEDIA_CLASS;

export const CARD_IMAGE_FRAME_SM =
  "relative flex aspect-[2/3] w-full max-w-[140px] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-slate-800/90 to-black/70 p-1.5";

export const CARD_IMAGE_FRAME_XS =
  "relative flex aspect-[2/3] w-full max-w-[100px] items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-gradient-to-b from-slate-800/90 to-black/70 p-1";
