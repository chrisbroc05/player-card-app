import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import CardImage from "./CardImage";
import MotionSelectionGrid from "./MotionSelectionGrid";
import { motionLabel } from "../constants/animationMotions";
import { vaultTierBadge } from "../utils/tierStyles";
import { tierConfettiClass } from "../utils/collectionCongrats";
import { formatMoney } from "../utils/marketplace";
import { creditTopUpShortfallMessage } from "../utils/credits";
import { CARD_IMAGE_FRAME_MODAL } from "../utils/cardImageStyles";
import { useScrollModalIntoView } from "../hooks/useScrollIntoViewOnChange";

const CONFETTI_COUNT = 36;

function ConfettiBurst({ tier }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
        id: i,
        left: `${(i * 97) % 100}%`,
        drift: `${((i % 7) - 3) * 14}px`,
        size: i % 3 === 0 ? "6px" : i % 3 === 1 ? "8px" : "5px",
        shape: i % 2 === 0 ? "50%" : "2px",
        delay: `${(i % 10) * 0.05}s`,
        duration: `${1.6 + (i % 5) * 0.12}s`,
      })),
    []
  );

  return (
    <div
      className={`collection-confetti pointer-events-none absolute inset-x-0 top-0 h-32 overflow-hidden ${tierConfettiClass(tier)}`}
      aria-hidden="true"
    >
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="collection-confetti-piece"
          style={{
            left: piece.left,
            "--confetti-drift": piece.drift,
            "--confetti-delay": piece.delay,
            "--confetti-duration": piece.duration,
            width: piece.size,
            height: piece.size,
            borderRadius: piece.shape,
          }}
        />
      ))}
    </div>
  );
}

export default function CollectionCongratsModal({
  open,
  card,
  showUpsell = true,
  animationCost = 10,
  creditBalance = 0,
  initialMotionId = "",
  motionCategoryLabel = "",
  motionIdsFilter = null,
  onAnimate,
  onMaybeLater,
  onGoToCollection,
  onCreditsClick,
}) {
  const [motionId, setMotionId] = useState(initialMotionId);
  const [motionError, setMotionError] = useState("");
  const dialogRef = useRef(null);
  useScrollModalIntoView(open, dialogRef);

  useEffect(() => {
    if (!open) return;
    setMotionId(initialMotionId || "");
    setMotionError("");
  }, [open, initialMotionId, card?.card_id]);

  if (!open || !card) return null;

  const badge = vaultTierBadge(card.tier);
  const cost = Number(animationCost) || 10;
  const balance = Number(creditBalance) || 0;
  const canAfford = balance >= cost;
  const shortfall = Math.max(0, cost - balance);
  const selectedMotionLabel = motionId ? motionLabel(motionId) : "";
  const showMotionPicker = showUpsell && !initialMotionId;

  function handleAnimateClick() {
    if (!showUpsell) {
      onGoToCollection?.();
      return;
    }
    if (!motionId) {
      setMotionError("Please select a motion to animate your card.");
      return;
    }
    setMotionError("");
    onAnimate?.(motionId);
  }

  return (
    <div className="fixed inset-0 z-[115] flex items-end justify-center bg-black/75 p-3 sm:items-center sm:p-4">
      <div
        ref={dialogRef}
        className="scroll-focus-target relative max-h-[92vh] w-full min-w-0 overflow-y-auto rounded-2xl border border-white/10 bg-cardBg shadow-2xl shadow-black/60 sm:min-w-[440px] sm:max-w-[520px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="collection-congrats-title"
      >
        <ConfettiBurst tier={card.tier} />

        <div className="relative px-4 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-7">
          <section className="text-center">
            <h2 id="collection-congrats-title" className="text-2xl font-bold tracking-tight text-white sm:text-[1.65rem]">
              Your card is official! 🎉
            </h2>

            <div className="mx-auto mt-5 w-full min-w-[220px] max-w-[260px]">
              <CardImage
                card={card}
                alt={card.player_name || "Your card"}
                frameClassName={CARD_IMAGE_FRAME_MODAL}
                showInfoBanner
              />
            </div>

            <p className="mt-4 text-lg font-semibold text-white">{card.player_name}</p>
            <div className="mt-2 flex justify-center">
              <span className={`inline-flex rounded-full border px-3 py-0.5 text-sm font-medium ${badge.pill}`}>
                {badge.label}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-400">
              <span className="font-mono text-slate-300">{card.card_id}</span> has been added to your collection
            </p>
          </section>

          {showUpsell ? (
            <>
              <div className="my-6 border-t border-white/10" />

              <section>
                <h3 className="text-center text-lg font-semibold text-white">Want to bring it to life?</h3>
                <p className="mt-2 text-center text-sm leading-relaxed text-slate-300">
                  Animate your card with AI-powered motion for just {formatMoney(cost)}. Watch your player come alive
                  with a cinematic sports moment.
                </p>

                {motionCategoryLabel && selectedMotionLabel ? (
                  <p className="mt-4 text-center text-sm text-slate-300">
                    Motion: <span className="font-semibold text-violet-200">{selectedMotionLabel}</span>
                    <span className="text-slate-500"> · {motionCategoryLabel}</span>
                  </p>
                ) : motionCategoryLabel ? (
                  <p className="mt-4 text-center text-sm text-slate-400">
                    Suggested category: <span className="font-medium text-violet-200">{motionCategoryLabel}</span>
                  </p>
                ) : null}

                {showMotionPicker ? (
                  <div className="mt-4 rounded-xl border border-white/10 bg-cardBg2 p-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Choose a motion</p>
                    <MotionSelectionGrid
                      compact
                      value={motionId}
                      onChange={(id) => {
                        setMotionId(id);
                        setMotionError("");
                      }}
                      error={motionError}
                      motionIds={motionIdsFilter}
                    />
                  </div>
                ) : null}

                {motionError && !showMotionPicker ? (
                  <p className="mt-3 text-center text-sm text-rose-300">{motionError}</p>
                ) : null}

                <div className="mt-5 space-y-2">
                  {canAfford ? (
                    <button
                      type="button"
                      onClick={handleAnimateClick}
                      className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-violet-600 px-4 text-base font-bold text-white shadow-[0_0_28px_rgba(139,92,246,0.35)] transition hover:from-violet-400 hover:to-violet-500"
                    >
                      Animate My Card — {formatMoney(cost)}
                    </button>
                  ) : (
                    <>
                      <p className="text-center text-sm text-amber-100">
                        {creditTopUpShortfallMessage(shortfall)}
                      </p>
                      <Link
                        to="/credits"
                        onClick={onCreditsClick}
                        className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-violet-600 px-4 text-base font-bold text-white shadow-[0_0_28px_rgba(139,92,246,0.35)] transition hover:from-violet-400 hover:to-violet-500"
                      >
                        Add Credits to Animate
                      </Link>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={onMaybeLater}
                    className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-white/20 bg-transparent px-4 text-sm font-medium text-slate-300 transition hover:border-white/30 hover:bg-white/5"
                  >
                    Maybe Later — Go to My Collection
                  </button>
                </div>

                <p className="mt-4 text-center text-xs text-slate-500">
                  Want more copies? Add them from My Collection anytime.
                </p>
              </section>
            </>
          ) : (
            <div className="mt-6">
              <button
                type="button"
                onClick={onGoToCollection}
                className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-neonTeal px-4 text-sm font-semibold text-slate-950 transition hover:opacity-90"
              >
                Go to My Collection
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
