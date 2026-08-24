import React, { useEffect, useState } from "react";
import CardCreationExperience from "./CardCreationExperience";
import PreviewSelectionPanel from "./PreviewSelectionPanel";
import "../styles/generationOverlay.css";

export default function GenerationOverlay({
  open = false,
  view = "experience",
  showCloseButton = false,
  onCloseRequest,
  cardCreationProps = null,
  compareProps = null,
}) {
  const [revealLanded, setRevealLanded] = useState(false);

  useEffect(() => {
    if (!open) {
      setRevealLanded(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (view === "compare") {
      setRevealLanded(true);
    }
  }, [view]);

  if (!open) return null;

  const canClose = showCloseButton && (revealLanded || view === "compare");

  return (
    <div className="generation-overlay" role="dialog" aria-modal="true" aria-label="Card generation">
      {canClose ? (
        <button
          type="button"
          className="generation-overlay__close"
          aria-label="Close and start over"
          onClick={onCloseRequest}
        >
          ✕
        </button>
      ) : null}

      <div
        className={`generation-overlay__body${view === "compare" ? " generation-overlay__body--compare" : ""}`}
      >
        {view === "experience" && cardCreationProps ? (
          <CardCreationExperience
            {...cardCreationProps}
            fullscreen
            onRevealLanded={() => setRevealLanded(true)}
          />
        ) : null}

        {view === "compare" && compareProps ? (
          <PreviewSelectionPanel {...compareProps} compareViewOpen overlayMode />
        ) : null}
      </div>
    </div>
  );
}
