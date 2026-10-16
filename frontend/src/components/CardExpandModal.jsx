import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import CardImage from "../components/CardImage";
import CardDetailHero from "./CardDetailHero";
import { CARD_IMAGE_FRAME_DETAIL } from "../utils/cardImageStyles";

export default function CardExpandModal({
  open,
  onClose,
  card,
  alt = "Card",
  localHighlightVideoUrl = "",
  highlightTrimStart,
  highlightTrimEnd,
  cacheBust,
  protectMedia = false,
  useOwnerVideoProxy = false,
  token = "",
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !card) return null;

  const overlay = (
    <div
      className="card-expand-modal card-expand-modal--portal fixed inset-0 flex items-center justify-center bg-black/92 p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Full size card preview"
      onClick={() => onClose?.()}
    >
      <div
        className="flex h-full w-full max-h-[calc(100vh-64px)] max-w-[calc(100vw-64px)] items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <CardDetailHero>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose?.();
            }}
            className="card-expand-modal__close"
            aria-label="Close full size preview"
          >
            ×
          </button>
          <CardImage
            card={card}
            alt={alt}
            localHighlightVideoUrl={localHighlightVideoUrl}
            highlightTrimStart={highlightTrimStart}
            highlightTrimEnd={highlightTrimEnd}
            cacheBust={cacheBust}
            variant="detail"
            forcePlay
            showInfoBanner
            frameClassName={CARD_IMAGE_FRAME_DETAIL}
            protectMedia={protectMedia}
            useOwnerVideoProxy={useOwnerVideoProxy}
            token={token}
          />
        </CardDetailHero>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
