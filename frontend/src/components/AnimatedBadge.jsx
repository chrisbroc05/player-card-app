import React from "react";

/** Distinct from tier badges — marks AI-animated collectibles */
export default function AnimatedBadge({ className = "" }) {
  return (
    <span
      className={`pointer-events-none inline-flex items-center rounded-md border border-violet-400/60 bg-violet-500/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-violet-100 shadow-[0_0_12px_rgba(167,139,250,0.45)] ${className}`}
    >
      Animated
    </span>
  );
}
