import React, { useEffect, useMemo, useRef, useState } from "react";
import CardImage from "./CardImage";
import ExpandableCardView from "./ExpandableCardView";
import HighlightCardPreview from "./HighlightCardPreview";
import { StartOverButton } from "./StartOverConfirmModal";
import GenerationCapNotice, { GenerationDailyUsageHint } from "./GenerationCapNotice";
import { formatMoney } from "../utils/marketplace";

function previewKey(preview, index) {
  return preview?.card_id || preview?.image_url || `preview-${index}`;
}

function ScrollDots({ count, activeIndex }) {
  if (count <= 1) return null;
  return (
    <div className="preview-comparison__dots" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={`preview-comparison__dot${i === activeIndex ? " preview-comparison__dot--active" : ""}`}
        />
      ))}
    </div>
  );
}

export default function PreviewSelectionPanel({
  previews = [],
  selectedPreviewId = "",
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
  showSwipeHint = true,
}) {
  const scrollRef = useRef(null);
  const [activeScrollIndex, setActiveScrollIndex] = useState(0);
  const [hintDismissed, setHintDismissed] = useState(false);
  const compareMode = previews.length > 1;

  useEffect(() => {
    setActiveScrollIndex(0);
    setHintDismissed(false);
  }, [previews.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !compareMode) return undefined;

    const onScroll = () => {
      const items = el.querySelectorAll(".preview-option");
      if (!items.length) return;
      const left = el.scrollLeft;
      let best = 0;
      let bestDist = Infinity;
      items.forEach((node, i) => {
        const dist = Math.abs(node.offsetLeft - left);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      setActiveScrollIndex(best);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [compareMode, previews.length]);

  const selectedPreview = useMemo(
    () => previews.find((p) => p.card_id === selectedPreviewId) || null,
    [previews, selectedPreviewId]
  );

  const renderPreviewMedia = (preview, index) => {
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
    return (
      <ExpandableCardView showHint card={displayCard} alt={`Preview ${index + 1}`}>
        <CardImage
          card={displayCard}
          alt={`Preview ${index + 1}`}
          showInfoBanner
          playOnHover={isHighlightCardType}
          forcePlay={isHighlightCardType}
        />
      </ExpandableCardView>
    );
  };

  if (!previews.length) return null;

  if (!compareMode) {
    const preview = previews[0];
    return (
      <div className="preview-selection preview-selection--single">
        <div className="preview-selection__hero">{renderPreviewMedia(preview, 0)}</div>
        <div className="preview-selection__actions">
          <button
            type="button"
            onClick={() => onAddToCollection?.(preview)}
            disabled={addCollectionLoading || orderActionBusy}
            className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl btn-primary px-6 py-3 text-base font-semibold text-slate-950 disabled:opacity-50"
          >
            Add to Collection
          </button>
          {isPreviewLimitReached ? (
            <p className="text-center text-sm text-slate-400">
              Maximum previews reached — pick your favorite!
            </p>
          ) : generationCap.blocked ? (
            <GenerationCapNotice usage={generationUsage} period={generationCap.period} />
          ) : (
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
          )}
          <StartOverButton
            onClick={onStartOver}
            disabled={orderActionBusy || addCollectionLoading}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="preview-selection preview-selection--compare">
      <div className="preview-selection__header">
        <h3 className="preview-selection__title">Pick Your Favorite</h3>
        <p className="preview-selection__subtitle">
          {isAnimatedCardType
            ? "Choose which card to animate and add to your collection"
            : "Choose which card to add to your collection"}
        </p>
      </div>

      {showSwipeHint && !hintDismissed ? (
        <p className="preview-comparison__swipe-hint">← Swipe to compare →</p>
      ) : null}

      <div className="preview-comparison" ref={scrollRef}>
        {previews.map((preview, index) => {
          const id = preview.card_id || previewKey(preview, index);
          const isSelected = selectedPreviewId === id;
          return (
            <button
              type="button"
              key={previewKey(preview, index)}
              className={`preview-option${isSelected ? " preview-option--selected" : ""}`}
              onClick={() => {
                setHintDismissed(true);
                onSelectPreview?.(preview);
              }}
              aria-pressed={isSelected}
            >
              <div className="preview-number">
                Preview {index + 1}
                {index === 0 ? (
                  <span className="free-badge">FREE</span>
                ) : (
                  <span className="paid-badge">{formatMoney(additionalPreviewCost)}</span>
                )}
              </div>
              <div className="preview-option__media">{renderPreviewMedia(preview, index)}</div>
              {isSelected ? (
                <div className="selected-overlay" aria-hidden>
                  ✓ Selected
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      <ScrollDots count={previews.length} activeIndex={activeScrollIndex} />

      <div className="preview-selection__actions">
        <button
          type="button"
          onClick={() => selectedPreview && onAddToCollection?.(selectedPreview)}
          disabled={!selectedPreview || addCollectionLoading || orderActionBusy}
          className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl btn-primary px-6 py-3 text-base font-semibold text-slate-950 disabled:opacity-50"
        >
          Add Selected Card to Collection
        </button>

        {isPreviewLimitReached ? (
          <p className="text-center text-sm text-brand-gold/90">
            Maximum previews reached — pick your favorite!
          </p>
        ) : generationCap.blocked ? (
          <GenerationCapNotice usage={generationUsage} period={generationCap.period} />
        ) : (
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
        )}

        {!canAffordRegenerate ? (
          <p className="text-center text-xs text-amber-200/90">
            You need {formatMoney(additionalPreviewCost)} in credits to generate another preview.
          </p>
        ) : null}

        <StartOverButton
          onClick={onStartOver}
          disabled={orderActionBusy || addCollectionLoading}
        />
      </div>
    </div>
  );
}
