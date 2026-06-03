import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import CardImage from "./CardImage";
import AnimatedAiDisclaimer from "./AnimatedAiDisclaimer";
import { formatMoney } from "../utils/marketplace";
import { useScrollModalIntoView } from "../hooks/useScrollIntoViewOnChange";

const CONFIRM_DELAY_MS = 1500;

export default function AnimateCardConfirmModal({
  open,
  onClose,
  onConfirm,
  busy = false,
  card = null,
  previewImageUrl = "",
  previewAlt = "Card preview",
  motionName = "",
  cost = 10,
  creditBalance = 0,
  showAiDisclaimer = false,
  confirmationOnly = false,
}) {
  const [confirmEnabled, setConfirmEnabled] = useState(false);
  const dialogRef = useRef(null);
  useScrollModalIntoView(open, dialogRef);

  useEffect(() => {
    if (!open) {
      setConfirmEnabled(false);
      return undefined;
    }
    setConfirmEnabled(false);
    const timer = setTimeout(() => setConfirmEnabled(true), CONFIRM_DELAY_MS);
    return () => clearTimeout(timer);
  }, [open]);

  if (!open) return null;

  const animationCost = Number(cost) || 10;
  const balance = Number(creditBalance) || 0;
  const canAfford = confirmationOnly || balance >= animationCost;
  const shortfall = confirmationOnly ? 0 : Math.max(0, animationCost - balance);
  const hasPreview = Boolean(card || previewImageUrl);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-3 sm:items-center sm:p-4">
      <div
        ref={dialogRef}
        className="scroll-focus-target max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-cardBg p-4 shadow-2xl sm:p-6"
        role="dialog"
        aria-labelledby="animate-confirm-title"
        aria-modal="true"
      >
        <h3 id="animate-confirm-title" className="text-xl font-semibold text-white">
          Ready to animate your card?
        </h3>

        {hasPreview ? (
          <div className="mx-auto mt-5 max-w-[160px]">
            {card ? (
              <CardImage
                card={card}
                alt={previewAlt}
                frameClassName="aspect-[2/3] w-full overflow-hidden rounded-lg border border-white/10"
              />
            ) : (
              <div className="aspect-[2/3] w-full overflow-hidden rounded-lg border border-white/10">
                <img src={previewImageUrl} alt={previewAlt} className="h-full w-full object-cover" />
              </div>
            )}
          </div>
        ) : null}

        {motionName ? (
          <p className="mt-4 text-center text-sm text-slate-300">
            Motion: <span className="font-semibold text-violet-200">{motionName}</span>
          </p>
        ) : null}

        <div className="mt-5 space-y-2 rounded-xl border border-white/10 bg-cardBg2 px-4 py-3 text-sm">
          {confirmationOnly ? (
            <p className="text-slate-200">
              Your <span className="font-semibold text-white">{formatMoney(animationCost)}</span> animated card fee was
              applied when your preview was generated.
            </p>
          ) : (
            <>
              <p className="text-slate-200">
                <span className="font-semibold text-white">{formatMoney(animationCost)}</span> will be deducted from
                your credit balance
              </p>
              <p className="text-slate-400">
                Your balance: <span className="font-semibold text-neonTeal">{formatMoney(balance)}</span>
              </p>
            </>
          )}
        </div>

        {!canAfford ? (
          <div className="mt-4 rounded-xl border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <p>You need {formatMoney(shortfall)} more to animate this card</p>
            <Link
              to="/credits"
              className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-neonTeal px-4 text-sm font-semibold text-slate-950"
            >
              Add Credits
            </Link>
          </div>
        ) : null}

        <div className="mt-4 rounded-xl border border-violet-400/35 bg-violet-500/10 px-4 py-3 text-sm leading-relaxed text-violet-100">
          This is a one-time upgrade. Once animated, this cannot be undone or refunded. Make sure you love your card
          before animating.
        </div>

        {showAiDisclaimer ? <AnimatedAiDisclaimer className="mt-3 px-1" /> : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-white/20 px-4 text-sm font-medium text-slate-300 disabled:opacity-50"
          >
            Go Back
          </button>
          {canAfford ? (
            <button
              type="button"
              disabled={busy || !confirmEnabled}
              onClick={onConfirm}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Starting…" : "Animate My Card"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
