import React from "react";
import CardImage from "./CardImage";
import { CARD_IMAGE_FRAME_MODAL } from "../utils/cardImageStyles";
import { rarityDisplay, vaultTierBadge } from "../utils/tierStyles";

/** @deprecated Use MarketplaceModalShell */
export const MARKETPLACE_MODAL_OVERLAY_CLASS =
  "marketplace-modal-overlay";

/** @deprecated Use MarketplaceModalShell */
export function marketplaceModalPanelClass(borderClass = "border-white/10") {
  return `marketplace-modal-panel border ${borderClass} bg-cardBg shadow-2xl shadow-black/50 sm:min-w-[420px] sm:max-w-lg sm:rounded-2xl sm:p-6`;
}

export function MarketplaceModalShell({
  open,
  zIndex = 70,
  borderClass = "border-white/10",
  ariaLabelledBy,
  children,
  onBackdropClick,
}) {
  if (!open) return null;

  return (
    <div
      className="marketplace-modal-overlay"
      style={{ zIndex }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onBackdropClick?.();
      }}
    >
      <div
        className={`marketplace-modal-panel border ${borderClass} bg-cardBg shadow-2xl shadow-black/50`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="marketplace-modal-handle" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

export function MarketplaceModalContent({ children, className = "" }) {
  return <div className={`marketplace-modal-content ${className}`.trim()}>{children}</div>;
}

export function MarketplaceModalActions({ children, className = "" }) {
  return <div className={`marketplace-modal-actions ${className}`.trim()}>{children}</div>;
}

export function MarketplaceModalSuccessIcon() {
  return (
    <div className="marketplace-modal-success-icon" aria-hidden="true">
      ✓
    </div>
  );
}

export function MarketplaceModalCardSection({ card, children, centered = false }) {
  const centeredClass = centered ? "marketplace-modal-card-section--centered" : "";

  return (
    <div className={`marketplace-modal-card-section ${centeredClass}`.trim()}>
      <div className="marketplace-modal-card-section__image">
        <CardImage card={card} alt={card?.player_name} frameClassName={CARD_IMAGE_FRAME_MODAL} />
      </div>
      <div className="marketplace-modal-card-section__details">{children}</div>
    </div>
  );
}

export function MarketplaceModalCardDetails({ listing, extra = null }) {
  const badge = vaultTierBadge(listing?.tier);

  return (
    <>
      <p className="text-base font-semibold leading-snug text-white break-words">
        {listing?.player_name || "Card"}
      </p>
      {listing?.team_name ? (
        <p className="text-[13px] leading-relaxed text-slate-400 break-words">{listing.team_name}</p>
      ) : null}
      {listing?.tier ? (
        <div className="pt-1">
          <span
            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[13px] font-medium ${badge.pill}`}
          >
            {badge.label}
          </span>
        </div>
      ) : null}
      {listing?.card_id ? (
        <p className="font-mono text-[13px] leading-relaxed text-neonTeal/90 break-all">
          {listing.card_id}
        </p>
      ) : null}
      {listing?.rarity ? (
        <p className="text-[13px] text-slate-400">{rarityDisplay(listing.rarity)}</p>
      ) : null}
      {extra}
    </>
  );
}
