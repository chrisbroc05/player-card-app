/** Offset for sticky/future-fixed header clearance on mobile */
export const SCROLL_HEADER_OFFSET_PX = 80;

/**
 * Smoothly scroll an element into view. Respects prefers-reduced-motion.
 * @param {Element | null | undefined} element
 * @param {{ block?: ScrollLogicalPosition, inline?: ScrollLogicalPosition }} [options]
 */
export function smoothScrollIntoView(element, options = {}) {
  if (!element || typeof window === "undefined") return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const behavior = reducedMotion ? "auto" : "smooth";
  const block = options.block ?? "center";

  element.scrollIntoView({
    behavior,
    block,
    inline: options.inline ?? "nearest",
  });
}

/** Wait for layout/paint after React state updates before scrolling */
export function scrollAfterPaint(element, options) {
  if (typeof window === "undefined") return;
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      smoothScrollIntoView(element, options);
    });
  });
}
