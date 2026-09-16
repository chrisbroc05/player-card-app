import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { toApiUrl } from "../config/api";
import JerseyAnimationTip from "./JerseyAnimationTip";
import { themeDisplayLabel } from "../utils/cardBannerStyles";
import { normalizeHighlightThemeKey } from "../utils/highlightCardStyles";

export default function AnimatedCardChoiceModal({
  open,
  previewImageUrl,
  previewAlt = "Your card",
  previewCard = null,
  onAnimate,
  onSaveStatic,
  busy = false,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const tier = previewCard?.tier ?? "missing";
    const theme = previewCard?.theme ?? previewCard?.special_theme ?? "missing";
    console.log("[AnimatedCardChoiceModal] preview card tier/theme", { tier, theme, previewCard });
  }, [open, previewCard]);

  if (!open || !previewImageUrl) return null;

  const imageSrc = toApiUrl(previewImageUrl);
  const themeRaw = previewCard?.theme ?? previewCard?.special_theme ?? "";
  const themeKey = normalizeHighlightThemeKey(themeRaw);
  const themeLabel = themeDisplayLabel(themeRaw);
  const showThemeDisclaimer = themeKey !== "default" && Boolean(themeLabel);

  return createPortal(
    <div className="static-card-ready-overlay" role="presentation">
      <div
        className="static-card-ready-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="static-card-ready-title"
      >
        <h2 id="static-card-ready-title" className="static-card-ready-modal__title">
          Your Card is Ready!
        </h2>

        <div className="static-card-ready-modal__card-wrap">
          <img
            src={imageSrc}
            alt={previewAlt}
            className="static-card-ready-modal__card-image"
          />
        </div>

        {showThemeDisclaimer ? (
          <div className="animated-theme-disclaimer static-card-ready-modal__disclaimer" role="note">
            <span className="animated-theme-disclaimer__icon" aria-hidden>
              ℹ️
            </span>
            <p className="animated-theme-disclaimer__text">
              Note: Your {themeLabel} theme styling appears on the card frame and banner. The animation shows your
              player photo in motion — the theme is applied as a visual overlay when viewing the card.
            </p>
          </div>
        ) : null}

        <JerseyAnimationTip className="static-card-ready-modal__tip" />

        <div className="static-card-ready-modal__actions">
          <button
            type="button"
            disabled={busy}
            onClick={onAnimate}
            className="static-card-ready-modal__btn static-card-ready-modal__btn--primary"
          >
            ⚡ Animate This Card
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onSaveStatic}
            className="static-card-ready-modal__btn static-card-ready-modal__btn--secondary"
          >
            Save as Static Card
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
