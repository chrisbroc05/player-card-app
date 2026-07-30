import React from "react";

/** Distinct from tier and animated badges — marks real-video highlight collectibles */
export default function HighlightBadge({ className = "" }) {
  return (
    <span
      className={`pointer-events-none inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white shadow-[0_0_12px_rgba(216,90,48,0.45)] ${className}`}
      style={{ backgroundColor: "#D85A30" }}
    >
      Highlight
    </span>
  );
}
