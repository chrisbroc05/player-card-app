import React, { useEffect } from "react";
import CardImage from "./CardImage";
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

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/88 p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Full size card preview"
      onClick={() => onClose?.()}
    >
      <div
        className="flex h-full w-full max-h-[calc(100vh-64px)] max-w-[calc(100vw-64px)] items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="card-expand-modal__card relative aspect-[5/7] h-full w-auto max-w-full"
          style={{
            maxHeight: "calc(100vh - 64px)",
            maxWidth: "min(calc(100vw - 64px), calc((100vh - 64px) * 5 / 7))",
          }}
        >
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
            frameClassName={`${CARD_IMAGE_FRAME_DETAIL} h-full w-full max-h-full`}
            protectMedia={protectMedia}
            useOwnerVideoProxy={useOwnerVideoProxy}
            token={token}
          />
        </div>
      </div>
    </div>
  );
}
