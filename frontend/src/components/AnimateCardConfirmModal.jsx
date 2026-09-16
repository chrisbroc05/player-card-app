import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AnimatedAiDisclaimer from "./AnimatedAiDisclaimer";
import JerseyAnimationTip from "./JerseyAnimationTip";
import Modal from "./Modal";
import { toApiUrl } from "../config/api";
import { getCardBannerStyles } from "../utils/cardBannerStyles";
import { formatMoney } from "../utils/marketplace";
import { creditTopUpShortfallMessage } from "../utils/credits";
import { rarityDisplayLabel } from "../utils/rarityStyles";

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
  intentOnly = false,
  confirmationOnly = false,
}) {
  const [confirmEnabled, setConfirmEnabled] = useState(false);

  useEffect(() => {
    if (!open) return;
    const tier = card?.tier ?? "missing";
    const theme = card?.theme ?? card?.special_theme ?? "missing";
    console.log("[AnimateCardConfirmModal] preview card tier/theme", { tier, theme, card });
  }, [open, card]);

  useEffect(() => {
    if (!open) {
      setConfirmEnabled(false);
      return undefined;
    }
    setConfirmEnabled(false);
    const timer = setTimeout(() => setConfirmEnabled(true), CONFIRM_DELAY_MS);
    return () => clearTimeout(timer);
  }, [open]);

  const animationCost = Number(cost) || 10;
  const balance = Number(creditBalance) || 0;
  const canAfford = intentOnly || confirmationOnly || balance >= animationCost;
  const shortfall = intentOnly || confirmationOnly ? 0 : Math.max(0, animationCost - balance);
  const hasPreview = Boolean(card || previewImageUrl);

  const previewMeta = useMemo(() => {
    const previewCard =
      card ||
      (previewImageUrl
        ? {
            image_url: previewImageUrl,
            player_name: previewAlt || "Card preview",
            tier: "rookie",
          }
        : null);
    if (!previewCard) return null;
    const imageSrc = previewCard.image_url || previewImageUrl;
    if (!imageSrc) return null;
    const bannerStyles = getCardBannerStyles(
      previewCard.tier,
      previewCard.theme || previewCard.special_theme
    );
    const rarityLabel = rarityDisplayLabel(previewCard.rarity, previewCard.rarity_display_name);
    const rarityNorm = String(rarityLabel || "").trim().toLowerCase();
    const showRarityLabel =
      rarityNorm &&
      rarityNorm !== "base" &&
      rarityNorm !== "standard" &&
      rarityNorm !== "common";
    return {
      imageSrc: toApiUrl(imageSrc),
      tierLabel: bannerStyles.tierPillLabel,
      rarityLabel: showRarityLabel ? rarityLabel : "",
    };
  }, [card, previewImageUrl, previewAlt]);

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      maxWidth="500px"
      ariaLabelledby="animate-confirm-title"
      contentClassName="modal-portal-content--animate"
    >
      <h3 id="animate-confirm-title" className="text-xl font-semibold text-white">
        {intentOnly ? "Ready to create your animated card?" : "Ready to animate your card?"}
      </h3>

      {hasPreview && previewMeta ? (
        <div className="animate-confirm-card-preview-wrap">
          <div className="animate-confirm-card-preview">
            <img
              src={previewMeta.imageSrc}
              alt={previewAlt}
              className="animate-confirm-card-preview__image"
            />
          </div>
          {previewMeta.tierLabel ? (
            <p className="animate-confirm-card-preview__tier-label">{previewMeta.tierLabel}</p>
          ) : null}
          {previewMeta.rarityLabel ? (
            <p className="animate-confirm-card-preview__tier-label">{previewMeta.rarityLabel}</p>
          ) : null}
        </div>
      ) : null}

      {motionName ? (
        <p className="mt-5 text-center text-sm text-slate-300">
          Motion: <span className="font-semibold text-violet-200">{motionName}</span>
        </p>
      ) : null}

      <div className="mt-5 space-y-2 rounded-xl border border-white/10 bg-cardBg2 px-4 py-3 text-sm">
        {intentOnly ? (
          <p className="text-slate-200">
            We&apos;ll generate your static card preview first. The animated upgrade fee is only charged if you
            choose to animate after seeing your card.
          </p>
        ) : confirmationOnly ? (
          <p className="text-slate-200">Confirm to proceed with your animated upgrade.</p>
        ) : (
          <>
            <p className="text-slate-200">
              <span className="font-semibold text-white">{formatMoney(animationCost)}</span> will be deducted from
              your credit balance
            </p>
            <p className="text-slate-400">
              Your balance: <span className="font-semibold text-brand-gold">{formatMoney(balance)}</span>
            </p>
          </>
        )}
      </div>

      {!canAfford ? (
        <div className="mt-4 rounded-xl border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <p>{creditTopUpShortfallMessage(shortfall)}</p>
          <Link
            to="/credits"
            className="modal-portal-action mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl btn-primary px-4 text-sm font-semibold text-slate-950"
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

      {!intentOnly ? <JerseyAnimationTip className="mt-4" /> : null}

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className="modal-portal-action inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-white/20 px-4 text-sm font-medium text-slate-300 disabled:opacity-50"
        >
          Go Back
        </button>
        {canAfford ? (
          <button
            type="button"
            disabled={busy || !confirmEnabled}
            onClick={onConfirm}
            className="modal-portal-action inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Starting…" : intentOnly ? "Generate My Card Preview" : "Animate My Card"}
          </button>
        ) : null}
      </div>
    </Modal>
  );
}
