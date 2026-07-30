import React, { useCallback, useState } from "react";
import CardImage from "./CardImage";
import { CARD_IMAGE_FRAME_MODAL } from "../utils/cardImageStyles";
import { useHighlightStatusPolling } from "../hooks/useHighlightStatusPolling";

export default function HighlightProcessingScreen({
  card,
  cardId,
  token,
  onCompleted,
  onFailed,
}) {
  const [pollKey, setPollKey] = useState(0);

  const handleCompleted = useCallback(
    (data) => {
      onCompleted?.(data);
    },
    [onCompleted]
  );

  const handleFailed = useCallback(
    (data) => {
      onFailed?.(data);
    },
    [onFailed]
  );

  const { status, timedOut, failed } = useHighlightStatusPolling({
    cardId,
    token,
    enabled: Boolean(cardId && token),
    pollKey,
    onCompleted: handleCompleted,
    onFailed: handleFailed,
  });

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#D85A30]/35 bg-cardBg p-6 shadow-2xl">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white">Processing your highlight...</h2>
          <p className="mt-2 text-sm text-slate-400">
            We&apos;re preparing your clip. This usually takes 30-60 seconds.
          </p>
        </div>

        <div className="relative mx-auto mt-6 w-full max-w-[220px]">
          <div className="highlight-processing-pulse pointer-events-none absolute -inset-3 rounded-2xl border border-[#D85A30]/40 bg-[#D85A30]/10" />
          <div className="relative overflow-hidden rounded-xl ring-2 ring-[#D85A30]/45">
            {card ? (
              <CardImage
                card={card}
                alt={card.player_name || "Your card"}
                frameClassName={CARD_IMAGE_FRAME_MODAL}
                showInfoBanner={false}
              />
            ) : (
              <div className="aspect-[5/7] w-full bg-slate-900" />
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          <span className="highlight-processing-dot h-2 w-2 rounded-full bg-[#D85A30]" />
          <span className="highlight-processing-dot animation-delay-150 h-2 w-2 rounded-full bg-[#D85A30]" />
          <span className="highlight-processing-dot animation-delay-300 h-2 w-2 rounded-full bg-[#D85A30]" />
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          {status === "processing" ? "Hang tight — your highlight is almost ready." : null}
          {timedOut ? "This is taking longer than expected. We'll keep trying in the background." : null}
          {failed ? "Processing failed. Your credits have been refunded." : null}
        </p>

        {timedOut ? (
          <button
            type="button"
            onClick={() => setPollKey((k) => k + 1)}
            className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-white/20 bg-cardBg2 px-4 text-sm font-medium text-slate-100"
          >
            Check again
          </button>
        ) : null}
      </div>
    </div>
  );
}
