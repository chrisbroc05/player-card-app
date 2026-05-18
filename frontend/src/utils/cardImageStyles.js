/** Shared card image frames — 2:3 aspect, contain fit, no cropping */

/** Grid / collection / marketplace browse tiles */
export const CARD_IMAGE_FRAME =
  "relative flex aspect-[2/3] w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-slate-800/90 via-black/60 to-slate-900/95 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";

export const CARD_IMAGE_FRAME_ANIMATED =
  `${CARD_IMAGE_FRAME} ring-1 ring-violet-400/35 shadow-[0_0_28px_rgba(139,92,246,0.18)]`;

export const CARD_IMAGE_MEDIA_CLASS =
  "max-h-full max-w-full object-contain drop-shadow-[0_6px_20px_rgba(0,0,0,0.55)]";

/** Detail page — show full card including bottom name plate */
export const CARD_IMAGE_FRAME_DETAIL =
  "relative flex w-full max-w-md mx-auto items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-b from-slate-800/80 via-black/50 to-slate-900/90 p-3 sm:p-4 min-h-[280px] sm:min-h-[360px]";

export const CARD_IMAGE_MEDIA_DETAIL =
  "max-h-[min(78vh,820px)] w-auto max-w-full object-contain drop-shadow-[0_12px_40px_rgba(0,0,0,0.5)]";

export const CARD_IMAGE_FRAME_SM =
  "flex aspect-[2/3] w-full max-w-[140px] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-slate-800/90 to-black/70 p-1.5";

export const CARD_IMAGE_FRAME_XS =
  "flex aspect-[2/3] w-full max-w-[100px] items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-gradient-to-b from-slate-800/90 to-black/70 p-1";
