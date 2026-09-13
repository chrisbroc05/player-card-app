import React, { useEffect } from "react";
import { createPortal } from "react-dom";

/** Pill nav uses z-index 1000 — listing overlays use hard-coded values above all UI. */
const LISTING_OVERLAY_Z_INDEX = 999999;
const LISTING_CONTENT_Z_INDEX = 1000000;

const OVERLAY_STYLE = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  zIndex: LISTING_OVERLAY_Z_INDEX,
  backgroundColor: "rgba(0,0,0,0.8)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  boxSizing: "border-box",
};

const CONTENT_STYLE = {
  background: "#161616",
  border: "1px solid rgba(201,168,76,0.4)",
  borderRadius: "16px",
  padding: "20px",
  width: "100%",
  maxWidth: "340px",
  maxHeight: "75vh",
  overflowY: "auto",
  position: "relative",
  zIndex: LISTING_CONTENT_Z_INDEX,
  margin: "auto",
  boxSizing: "border-box",
  WebkitOverflowScrolling: "touch",
};

/**
 * Centered listing popup — always portaled to document.body.
 * @param {string} [debugLabel] — logs in dev to verify portal version is active
 */
export default function ListingModal({
  isOpen,
  onClose,
  children,
  maxWidth = "340px",
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

  const contentStyle = maxWidth === "340px" ? CONTENT_STYLE : { ...CONTENT_STYLE, maxWidth };

  return createPortal(
    <div style={OVERLAY_STYLE} role="presentation" onClick={onClose}>
      <div
        style={contentStyle}
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
