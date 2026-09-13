import React, { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Centered modal rendered via portal on document.body.
 * Bypasses parent stacking contexts and fixed nav overlays.
 */
export default function Modal({
  isOpen,
  onClose,
  children,
  maxWidth = "340px",
  ariaLabelledby,
  className = "",
  contentClassName = "",
}) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`modal-portal-backdrop ${className}`.trim()}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={`modal-portal-content ${contentClassName}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledby}
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
