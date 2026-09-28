import React, { useEffect } from "react";
import { createPortal } from "react-dom";

/** Pill nav uses z-index 1000 — listing overlays use hard-coded values above all UI. */
const LISTING_OVERLAY_Z_INDEX = 999999;
const LISTING_CONTENT_Z_INDEX = 1000000;

const SIZE_CLASS = {
  default: "listing-modal-dialog",
  medium: "listing-modal-dialog listing-modal-dialog--medium",
  wide: "listing-modal-dialog listing-modal-dialog--wide",
};

/**
 * Centered listing popup — always portaled to document.body.
 * @param {"default"|"medium"|"wide"} size — responsive max-width (mobile stays 340px)
 * @param {string} [debugLabel] — logs in dev to verify portal version is active
 */
export default function ListingModal({
  isOpen,
  onClose,
  children,
  size = "default",
  ariaLabelledby,
  debugLabel = "listing-modal",
}) {
  useEffect(() => {
    if (!isOpen) return undefined;
    if (import.meta.env.DEV && debugLabel) {
      console.log("[ListingModal] portal open:", debugLabel);
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen, debugLabel]);

  if (!isOpen) return null;

  const dialogClass = SIZE_CLASS[size] || SIZE_CLASS.default;

  return createPortal(
    <div
      className="listing-modal-overlay"
      style={{ zIndex: LISTING_OVERLAY_Z_INDEX }}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={dialogClass}
        style={{ zIndex: LISTING_CONTENT_Z_INDEX }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledby}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
