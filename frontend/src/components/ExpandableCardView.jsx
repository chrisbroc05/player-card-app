import React, { useState } from "react";
import CardExpandModal from "./CardExpandModal";

function ExpandHint() {
  return (
    <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
      <svg
        className="h-3.5 w-3.5 shrink-0 opacity-80"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
        <path d="M11 8v6M8 11h6" strokeLinecap="round" />
      </svg>
      <span>Tap to view full size</span>
    </p>
  );
}

/** Wraps a card preview; click opens full-screen expand modal. */
export default function ExpandableCardView({
  card,
  alt = "Card",
  showHint = false,
  localHighlightVideoUrl = "",
  highlightTrimStart,
  highlightTrimEnd,
  cacheBust,
  protectMedia = false,
  useOwnerVideoProxy = false,
  token = "",
  className = "",
  children,
}) {
  const [open, setOpen] = useState(false);

  function openModal(e) {
    if (e.target.closest("button, a, input, textarea, select, label")) return;
    setOpen(true);
  }

  function onKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        className={`cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-neonBlue/60 ${className}`}
        onClick={openModal}
        onKeyDown={onKeyDown}
        aria-label="View card full size"
      >
        {children}
      </div>
      {showHint ? <ExpandHint /> : null}
      <CardExpandModal
        open={open}
        onClose={() => setOpen(false)}
        card={card}
        alt={alt}
        localHighlightVideoUrl={localHighlightVideoUrl}
        highlightTrimStart={highlightTrimStart}
        highlightTrimEnd={highlightTrimEnd}
        cacheBust={cacheBust}
        protectMedia={protectMedia}
        useOwnerVideoProxy={useOwnerVideoProxy}
        token={token}
      />
    </>
  );
}
