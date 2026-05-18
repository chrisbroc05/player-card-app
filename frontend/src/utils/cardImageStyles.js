/** Shared card image frames — 2:3 aspect, contain fit, full card visible */

/** Grid / collection / marketplace browse tiles */
export const CARD_IMAGE_FRAME =
  "relative flex aspect-[2/3] w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-slate-800/90 via-black/60 to-slate-900/95 p-1.5 sm:p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";

export const CARD_IMAGE_FRAME_ANIMATED =
  `${CARD_IMAGE_FRAME} ring-1 ring-violet-400/35 shadow-[0_0_28px_rgba(139,92,246,0.18)]`;

/** Fills the 2:3 frame edge-to-edge (same for static PNG and video overlay) */
export const CARD_IMAGE_MEDIA_CLASS =
  "h-full w-full object-contain object-center drop-shadow-[0_6px_20px_rgba(0,0,0,0.55)]";

/** Detail page — same 2:3 proportions as grid, slightly larger cap */
export const CARD_IMAGE_FRAME_DETAIL =
  "relative mx-auto flex aspect-[2/3] w-full max-w-sm items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-800/80 via-black/50 to-slate-900/90 p-2 sm:max-w-md sm:p-3";

export const CARD_IMAGE_MEDIA_DETAIL = CARD_IMAGE_MEDIA_CLASS;

export const CARD_IMAGE_FRAME_SM =
  "relative flex aspect-[2/3] w-full max-w-[140px] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-slate-800/90 to-black/70 p-1.5";

export const CARD_IMAGE_FRAME_XS =
  "relative flex aspect-[2/3] w-full max-w-[100px] items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-gradient-to-b from-slate-800/90 to-black/70 p-1";
