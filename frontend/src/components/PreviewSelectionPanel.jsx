import React, { useEffect, useMemo, useState } from "react";
import CardImage from "./CardImage";
import ExpandableCardView from "./ExpandableCardView";
import HighlightCardPreview from "./HighlightCardPreview";
import PreviewAddConfirmModal from "./PreviewAddConfirmModal";
import { StartOverButton } from "./StartOverConfirmModal";
import GenerationCapNotice, { GenerationDailyUsageHint } from "./GenerationCapNotice";
import { hasAutoSignature } from "../utils/rarityStyles";
import { formatMoney } from "../utils/marketplace";

function previewKey(preview, index) {
  return preview?.card_id || preview?.image_url || `preview-${index}`;
}

function previewLabel(index, additionalPreviewCost) {
  if (index === 0) return `Preview ${index + 1} (Free)`;
  return `Preview ${index + 1} (${formatMoney(additionalPreviewCost)})`;
}

export default function PreviewSelectionPanel({
  previews = [],
  selectedPreviewId = "",
  compareViewOpen = false,
  onOpenCompare,
  onCloseCompare,
  onSelectPreview,
  onAddToCollection,
  onGenerateAnother,
  onStartOver,
  additionalPreviewCost = 0,
  isPreviewLimitReached = false,
  canAffordRegenerate = true,
  generationCap = { blocked: false },
  generationUsage = null,
  addCollectionLoading = false,
  orderActionBusy = false,
  isHighlightCardType = false,
  highlightClipDraft = null,
  highlightPreviewExpandCard = null,
  playerDisplayName = "",
  teamName = "",
  position = "",
  jerseyNumber = "",
  gradYear = "",
  orderTier = "rookie",
  specialTheme = null,
  previewToDisplayCard,
  isAnimatedCardType = false,
}) {
  const [confirmPreview, setConfirmPreview] = useState(null);
  const [confirmIndex, setConfirmIndex] = useState(-1);

  const hasMultiple = previews.length > 1;
  const latestPreview = previews[previews.length - 1] || null;

  useEffect(() => {
    if (!hasMultiple && compareViewOpen) {
      onCloseCompare?.();
    }
  }, [hasMultiple, compareViewOpen, onCloseCompare]);

  const selectedPreview = useMemo(
    () => previews.find((p) => p.card_id === selectedPreviewId) || null,
    [previews, selectedPreviewId]
  );

  const selectedIndex = useMemo(() => {
    if (!selectedPreview) return -1;
    return previews.findIndex((p) => p.card_id === selectedPreview.card_id);
  }, [previews, selectedPreview]);

  function renderPreviewCard(preview, index, { animateSignature = false } = {}) {
    if (isHighlightCardType && highlightClipDraft?.confirmed) {
      return (
        <ExpandableCardView
          showHint
          card={highlightPreviewExpandCard}
          alt={`Preview ${index + 1}`}
          localHighlightVideoUrl={highlightClipDraft.objectUrl}
          highlightTrimStart={highlightClipDraft.trimStart ?? 0}
          highlightTrimEnd={highlightClipDraft.trimEnd ?? null}
        >
          <HighlightCardPreview
            playerName={playerDisplayName}
            teamName={teamName}
            position={position}
            jerseyNumber={jerseyNumber}
            gradYear={gradYear}
            tier={orderTier}
            theme={specialTheme}
            clipDraft={highlightClipDraft}
            forcePlay
          />
        </ExpandableCardView>
      );
    }

    const displayCard = previewToDisplayCard(preview);
    const signature = animateSignature || hasAutoSignature(displayCard.rarity);

    return (
      <ExpandableCardView showHint card={displayCard} alt={`Preview ${index + 1}`}>
        <CardImage
          card={displayCard}
          alt={`Preview ${index + 1}`}
          variant="detail"
          showInfoBanner
          showRarityBadge
          animateSignature={signature}
          playOnHover={isHighlightCardType}
          forcePlay={isHighlightCardType}
        />
      </ExpandableCardView>
    );
  }

  function openAddConfirm(preview) {
    const index = previews.findIndex((p) => p.card_id === preview?.card_id);
    setConfirmPreview(preview);
    setConfirmIndex(index);
  }

  function handleConfirmAdd() {
    if (!confirmPreview) return;
    onAddToCollection?.(confirmPreview);
    setConfirmPreview(null);
    setConfirmIndex(-1);
  }

  function renderSecondaryActions() {
    if (isPreviewLimitReached) {
      return (
        <p className="text-center text-sm text-brand-gold/90">
          Maximum previews reached — pick your favorite!
        </p>
      );
    }
    if (generationCap.blocked) {
      return <GenerationCapNotice usage={generationUsage} period={generationCap.period} />;
    }
    return (
      <>
        <button
          type="button"
          onClick={onGenerateAnother}
          disabled={orderActionBusy}
          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-white/20 bg-cardBg2 px-5 py-2.5 text-sm font-medium text-slate-100 disabled:opacity-50"
        >
          Generate Another Preview — {formatMoney(additionalPreviewCost)}
        </button>
        <GenerationDailyUsageHint usage={generationUsage} className="text-center" />
      </>
    );
  }

  if (!previews.length) return null;

  if (!hasMultiple) {
    const preview = previews[0];
    return (
      <>
        <div className="preview-selection preview-selection--single">
          <div className="preview-selection__hero">{renderPreviewCard(preview, 0, { animateSignature: true })}</div>
          <div className="preview-selection__actions">
            <button
              type="button"
              onClick={() => onAddToCollection?.(preview)}
              disabled={addCollectionLoading || orderActionBusy}
              className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl btn-primary px-6 py-3 text-base font-semibold text-slate-950 disabled:opacity-50"
            >
              Add to Collection
            </button>
            {renderSecondaryActions()}
            <StartOverButton onClick={onStartOver} disabled={orderActionBusy || addCollectionLoading} />
          </div>
        </div>
      </>
    );
  }

  if (!compareViewOpen) {
    return (
      <div className="preview-selection preview-selection--multi-latest">
        <div className="preview-selection__hero">
          {latestPreview ? renderPreviewCard(latestPreview, previews.length - 1, { animateSignature: true }) : null}
        </div>
        <div className="preview-selection__actions">
          <button
            type="button"
            onClick={onOpenCompare}
            disabled={orderActionBusy}
            className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl btn-primary px-6 py-3 text-base font-semibold text-slate-950 disabled:opacity-50"
          >
            Compare &amp; Choose Preview
          </button>
          {renderSecondaryActions()}
          <StartOverButton onClick={onStartOver} disabled={orderActionBusy || addCollectionLoading} />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="preview-selection preview-selection--compare">
        <div className="preview-selection__header">
          <button
            type="button"
            onClick={onCloseCompare}
            className="mb-2 text-sm text-slate-400 hover:text-slate-200"
          >
            ← Back to latest preview
          </button>
          <h3 className="preview-selection__title">Pick Your Favorite</h3>
          <p className="preview-selection__subtitle">
            {isAnimatedCardType
              ? "Choose which card to animate and add to your collection"
              : "Choose which card to add to your collection"}
          </p>
        </div>

        <div className="preview-comparison">
          {previews.map((preview, index) => {
            const id = preview.card_id || previewKey(preview, index);
            const isSelected = selectedPreviewId === id;
            return (
              <div
                key={previewKey(preview, index)}
                className={`preview-option${isSelected ? " preview-option--selected" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => onSelectPreview?.(preview)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectPreview?.(preview);
                  }
                }}
                aria-pressed={isSelected}
              >
                <div className="preview-number">{previewLabel(index, additionalPreviewCost)}</div>
                <div
                  className="preview-option__media"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  role="presentation"
                >
                  {renderPreviewCard(preview, index)}
                </div>
                {isSelected ? (
                  <div className="selected-overlay" aria-hidden>
                    ✓ Selected
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="preview-selection__sticky-footer">
          <button
            type="button"
            onClick={() => selectedPreview && openAddConfirm(selectedPreview)}
            disabled={!selectedPreview || addCollectionLoading || orderActionBusy}
            className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl btn-primary px-6 py-3 text-base font-semibold text-slate-950 disabled:opacity-50"
          >
            Add Selected to Collection
          </button>
          {!canAffordRegenerate ? (
            <p className="text-center text-xs text-amber-200/90">
              You need {formatMoney(additionalPreviewCost)} in credits to generate another preview.
            </p>
          ) : null}
        </div>

        <div className="preview-selection__actions preview-selection__actions--compare-secondary">
          {renderSecondaryActions()}
          <StartOverButton onClick={onStartOver} disabled={orderActionBusy || addCollectionLoading} />
        </div>
      </div>

      <PreviewAddConfirmModal
        open={Boolean(confirmPreview)}
        previewLabel={confirmIndex >= 0 ? previewLabel(confirmIndex, additionalPreviewCost) : "this preview"}
        card={confirmPreview ? previewToDisplayCard(confirmPreview) : null}
        loading={addCollectionLoading}
        onConfirm={handleConfirmAdd}
        onCancel={() => {
          setConfirmPreview(null);
          setConfirmIndex(-1);
        }}
      />
    </>
  );
}
