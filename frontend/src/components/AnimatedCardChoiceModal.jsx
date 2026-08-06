import React, { useEffect, useRef } from "react";
import CardImage from "./CardImage";
import { useScrollModalIntoView } from "../hooks/useScrollIntoViewOnChange";

export default function AnimatedCardChoiceModal({
  open,
  previewImageUrl,
  previewAlt = "Your card",
  previewCard = null,
  onAnimate,
  onSaveStatic,
  busy = false,
}) {
  const dialogRef = useRef(null);
  useScrollModalIntoView(open, dialogRef);

  useEffect(() => {
    if (!open) return;
    const tier = previewCard?.tier ?? "missing";
    const theme = previewCard?.theme ?? previewCard?.special_theme ?? "missing";
    console.log("[AnimatedCardChoiceModal] preview card tier/theme", { tier, theme, previewCard });
  }, [open, previewCard]);

  if (!open || !previewImageUrl) return null;

  const displayCard =
    previewCard ||
    ({
      image_url: previewImageUrl,
      player_name: previewAlt,
      tier: "rookie",
    });

  return (
    <div className="fixed inset-0 z-[58] flex items-end justify-center bg-black/75 p-3 sm:items-center sm:p-4">
      <div
        ref={dialogRef}
        className="scroll-focus-target w-full min-w-0 overflow-hidden rounded-2xl border border-violet-400/30 bg-cardBg shadow-2xl sm:min-w-[480px] sm:max-w-lg"
        role="dialog"
        aria-labelledby="animated-choice-title"
        aria-modal="true"
      >
        <div className="border-b border-white/10 bg-gradient-to-r from-violet-500/15 via-cardBg2 to-neonTeal/10 px-6 py-5 text-center">
          <h2 id="animated-choice-title" className="text-lg font-semibold text-white sm:text-xl">
            Your card is ready — want to animate it?
          </h2>
        </div>

        <div className="px-6 py-6">
          <div className="mx-auto flex justify-center" style={{ width: 220, height: 308 }}>
            <div className="h-full w-full">
              <CardImage card={displayCard} alt={previewAlt} showInfoBanner variant="detail" />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={onAnimate}
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50"
            >
              Animate This Card
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onSaveStatic}
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-white/25 bg-transparent px-4 text-sm font-medium text-slate-200 transition hover:border-white/40 hover:bg-white/5 disabled:opacity-50"
            >
              Save as Static Card Instead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
