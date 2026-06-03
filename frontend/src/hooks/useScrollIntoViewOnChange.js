import { useEffect, useRef } from "react";
import { scrollAfterPaint } from "../utils/smoothScroll";

/**
 * Scroll `targetRef` into view when `active` is true and `deps` change.
 * Skips the first render to avoid scrolling on initial page load.
 */
export function useScrollIntoViewOnChange(targetRef, active, deps = [], options) {
  const skipFirst = useRef(true);

  useEffect(() => {
    if (!active || !targetRef.current) return;

    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }

    scrollAfterPaint(targetRef.current, options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, targetRef, ...deps]);
}

/** Scroll modal dialog into view when it opens */
export function useScrollModalIntoView(open, dialogRef) {
  useEffect(() => {
    if (!open || !dialogRef.current) return;
    scrollAfterPaint(dialogRef.current, { block: "center" });
  }, [open, dialogRef]);
}
