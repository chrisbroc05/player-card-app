/** Shared card image frames — 2.5:3.5 (5:7) aspect; UI banner is always separate */

export const CARD_ASPECT = "aspect-[5/7]";

/** @deprecated Layout is owned by CardDisplay — kept for size hints passed to CardImage */
export const CARD_IMAGE_FRAME = `relative w-full min-w-[210px] min-h-0 ${CARD_ASPECT}`;

export const CARD_IMAGE_FRAME_ANIMATED = `${CARD_IMAGE_FRAME} ring-1 ring-violet-400/35`;

export const CARD_IMAGE_FRAME_HIGHLIGHT = `${CARD_IMAGE_FRAME} ring-1 ring-[#D85A30]/45`;

export const CARD_MEDIA_SLOT = "card-image-area__stack absolute inset-0 overflow-hidden";

export const CARD_MEDIA_SLOT_DETAIL = CARD_MEDIA_SLOT;

export const CARD_VIDEO_CONTAINER = "card-animated-video-container";

export const CARD_VIDEO_WRAPPER_OVERLAY = `absolute inset-0 z-[1] ${CARD_VIDEO_CONTAINER}`;

export const CARD_VIDEO_DETAIL_WRAPPER =
  "card-image-area__stack absolute inset-0 overflow-hidden card-animated-video-container card-media-fill";

/** Player portrait — positioned by .card-image CSS inside .card-image-area */
export const CARD_IMAGE_MEDIA_CLASS = "card-image";

export const CARD_VIDEO_CLASS = "card-image card-animated-video";

export const CARD_VIDEO_GRID_CLASS = CARD_VIDEO_CLASS;

export const CARD_VIDEO_DETAIL_CLASS = CARD_VIDEO_CLASS;

export const CARD_IMAGE_FRAME_DETAIL = `relative w-full min-h-0 min-w-0 ${CARD_ASPECT}`;

/** Detail view static image — contain so full player photo shows */
export const CARD_IMAGE_MEDIA_DETAIL = "card-image";

export const CARD_IMAGE_FRAME_MODAL = `relative w-full min-w-[210px] max-w-[280px] ${CARD_ASPECT}`;

export const CARD_IMAGE_FRAME_LISTING_ROW = "relative h-full w-full min-w-0 max-w-full";

export const CARD_IMAGE_FRAME_SM = `relative w-full min-w-[210px] min-h-0 max-w-[140px] ${CARD_ASPECT}`;

export const CARD_IMAGE_FRAME_XS = `relative w-full min-w-[210px] min-h-0 max-w-[100px] ${CARD_ASPECT}`;

export const CARD_IMAGE_FRAME_THUMB = `relative w-full min-w-[210px] min-h-0 ${CARD_ASPECT}`;

export const CARD_IMAGE_FRAME_THUMB_ANIMATED = `${CARD_IMAGE_FRAME_THUMB} ring-1 ring-violet-400/30`;

export const CARD_IMAGE_FRAME_THUMB_HIGHLIGHT = `${CARD_IMAGE_FRAME_THUMB} ring-1 ring-[#D85A30]/35`;
