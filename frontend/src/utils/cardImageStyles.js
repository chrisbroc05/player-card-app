/** Shared card image frames — 2.5:3.5 (5:7) aspect; UI banner is always separate */

export const CARD_ASPECT = "aspect-[5/7]";

/** @deprecated Layout is owned by CardDisplay — kept for size hints passed to CardImage */
export const CARD_IMAGE_FRAME = `relative w-full min-w-[200px] min-h-0 ${CARD_ASPECT}`;

export const CARD_IMAGE_FRAME_ANIMATED = `${CARD_IMAGE_FRAME} ring-1 ring-violet-400/35`;

export const CARD_IMAGE_FRAME_HIGHLIGHT = `${CARD_IMAGE_FRAME} ring-1 ring-[#D85A30]/45`;

export const CARD_MEDIA_SLOT = "relative h-full w-full min-h-0 overflow-hidden";

export const CARD_MEDIA_SLOT_DETAIL = CARD_MEDIA_SLOT;

export const CARD_VIDEO_CONTAINER = "card-animated-video-container";

export const CARD_VIDEO_WRAPPER_OVERLAY = `absolute inset-0 z-[1] ${CARD_VIDEO_CONTAINER}`;

export const CARD_VIDEO_DETAIL_WRAPPER =
  "relative h-full w-full min-h-0 min-w-0 overflow-hidden card-animated-video-container card-media-fill";

/** Player portrait — cover fill inside top 70% art window */
export const CARD_IMAGE_MEDIA_CLASS =
  "block h-full w-full object-cover object-center";

export const CARD_VIDEO_CLASS = "card-animated-video";

export const CARD_VIDEO_GRID_CLASS = CARD_VIDEO_CLASS;

export const CARD_VIDEO_DETAIL_CLASS = CARD_VIDEO_CLASS;

export const CARD_IMAGE_FRAME_DETAIL = `relative w-full min-h-0 min-w-0 ${CARD_ASPECT}`;

/** Detail view static image — cover fill, face prioritized */
export const CARD_IMAGE_MEDIA_DETAIL =
  "block h-full w-full object-cover object-[center_top]";

export const CARD_IMAGE_FRAME_MODAL = `relative w-full min-w-[200px] max-w-[280px] ${CARD_ASPECT}`;

export const CARD_IMAGE_FRAME_LISTING_ROW = `relative w-full min-w-[200px] ${CARD_ASPECT}`;

export const CARD_IMAGE_FRAME_SM = `relative w-full min-w-[200px] min-h-0 max-w-[140px] ${CARD_ASPECT}`;

export const CARD_IMAGE_FRAME_XS = `relative w-full min-w-[200px] min-h-0 max-w-[100px] ${CARD_ASPECT}`;

export const CARD_IMAGE_FRAME_THUMB = `relative w-full min-w-[200px] min-h-0 ${CARD_ASPECT}`;

export const CARD_IMAGE_FRAME_THUMB_ANIMATED = `${CARD_IMAGE_FRAME_THUMB} ring-1 ring-violet-400/30`;

export const CARD_IMAGE_FRAME_THUMB_HIGHLIGHT = `${CARD_IMAGE_FRAME_THUMB} ring-1 ring-[#D85A30]/35`;
