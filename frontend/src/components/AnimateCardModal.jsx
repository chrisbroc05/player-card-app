import React, { useEffect, useState } from "react";
import CardImage from "./CardImage";
import Modal from "./Modal";
import MotionSelectionGrid from "./MotionSelectionGrid";
import AnimateCardConfirmModal from "./AnimateCardConfirmModal";
import { motionLabel } from "../constants/animationMotions";

export default function AnimateCardModal({ card, open, onClose, onConfirm, busy, creditBalance = 0, animationCost = 10 }) {
  const [motionId, setMotionId] = useState("");
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!open) {
      setMotionId("");
      setError("");
      setShowConfirm(false);
    }
  }, [open, card?.card_id]);

  if (!open || !card) return null;

  function handleClose() {
    setShowConfirm(false);
    setError("");
    onClose();
  }

  function handleContinue() {
    if (!motionId) {
      setError("Please select a motion.");
      return;
    }
    setError("");
    setShowConfirm(true);
  }

  function handleConfirm() {
    setShowConfirm(false);
    onConfirm(motionId);
  }

  return (
    <>
      <Modal
        isOpen={open && !showConfirm}
        onClose={handleClose}
        maxWidth="512px"
        ariaLabelledby="animate-modal-title"
        contentClassName="modal-portal-content--animate"
      >
        <h3 id="animate-modal-title" className="text-lg font-semibold text-white">
          Bring This Card to Life
        </h3>
        <p className="mt-1 text-sm text-slate-400">{card.player_name}</p>
        <p className="mt-2 text-sm text-slate-300">
          Add AI-generated motion to this card for{" "}
          <span className="font-semibold text-violet-200">${Number(animationCost).toFixed(2)}</span>
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Your animated card will be added to your collection as a new card. Your original static card will remain
          unchanged.
        </p>

        <div className="animate-modal-card-preview mt-4">
          <CardImage
            card={card}
            alt={card.player_name}
            frameClassName="h-full w-full"
            infoBannerVariant="compact"
            showInfoBanner
            playOnHover={false}
            variant="detail"
          />
        </div>

        <div className="mt-5">
          <MotionSelectionGrid compact value={motionId} onChange={setMotionId} error={error} />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={handleContinue}
            className="modal-portal-action inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            Continue
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleClose}
            className="modal-portal-action inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/20 px-4 text-sm text-slate-300"
          >
            Cancel
          </button>
        </div>
      </Modal>

      <AnimateCardConfirmModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
        busy={busy}
        card={card}
        previewAlt={card.player_name}
        motionName={motionId ? motionLabel(motionId) : ""}
        cost={animationCost}
        creditBalance={creditBalance}
      />
    </>
  );
}
