import React from "react";
import { formatMoney } from "../utils/marketplace";

function hasDisplayValue(value) {
  if (value == null) return false;
  return String(value).trim().length > 0;
}

function SummarySection({ title, rows }) {
  const visible = rows.filter(Boolean);
  if (!visible.length) return null;
  return (
    <div className="mt-4 first:mt-0">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
      <dl className="mt-2 divide-y divide-white/5 rounded-lg border border-white/10 bg-cardBg/60">
        {visible.map(({ label, value }) => (
          <div
            key={label}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-0.5 px-3 py-2.5 sm:grid-cols-[140px_1fr]"
          >
            <dt className="text-sm text-slate-400">{label}</dt>
            <dd className="text-sm font-medium text-white sm:text-right">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function TotalLine({ label, value, highlight = false }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <span className="text-slate-300">{label}</span>
      <span className={`font-medium tabular-nums ${highlight ? "text-brand-gold" : "text-white"}`}>
        {value}
      </span>
    </div>
  );
}

function formatPackLabel(copies) {
  return copies === 1 ? "1 card" : `${copies} copies`;
}

function formatAnimationSummaryValue({
  animateAtCheckout,
  animationActionLabel,
  animationScenarioLabel,
  animatedFee,
}) {
  const fee = formatMoney(animatedFee);
  const hasDetail = hasDisplayValue(animationActionLabel) || hasDisplayValue(animationScenarioLabel);

  if (hasDetail) {
    const detail = [animationActionLabel, animationScenarioLabel].filter(Boolean).join(" · ");
    if (animateAtCheckout) {
      return `${detail} (+${fee})`;
    }
    return detail;
  }

  if (animateAtCheckout) {
    return `+${fee}`;
  }

  return null;
}

export default function GenerationCostSummary({
  playerName,
  teamName,
  position,
  jerseyNumber,
  gradYear,
  tierLabel,
  themeLabel,
  isHighlight = false,
  isAnimated = false,
  copyQuantity = 1,
  pricing,
  animateAtCheckout = false,
  animationActionLabel = "",
  animationScenarioLabel = "",
  phase = "pay-upfront",
}) {
  if (!pricing) return null;

  const copies = Math.max(1, Number(copyQuantity) || 1);
  const basePrice = Number(pricing.base_price) || 0;
  const highlightFee = Number(pricing.highlight_fee) || 0;
  const animatedFee = Number(pricing.animated_fee ?? pricing.animated_upgrade_price) || 0;
  const showAnimatedLine = isAnimated || animateAtCheckout;
  const total =
    phase === "pay-upfront"
      ? Number(pricing.card_creation_price) ||
        basePrice + (isHighlight ? highlightFee : 0) + (showAnimatedLine ? animatedFee : 0)
      : 0;

  const cardTypeLabel = isHighlight ? "Highlight" : isAnimated ? "Animated" : "Static";
  const tierCardLabel = tierLabel ? `${tierLabel} Card` : "Card";
  const packLabel = formatPackLabel(copies);

  const animationSummaryValue = showAnimatedLine
    ? formatAnimationSummaryValue({
        animateAtCheckout,
        animationActionLabel,
        animationScenarioLabel,
        animatedFee,
      })
    : null;

  const animationSummaryLabel =
    isAnimated && !animateAtCheckout ? "Animation" : "Animated upgrade";

  const playerRows = [
    hasDisplayValue(playerName) && { label: "Player name", value: playerName },
    hasDisplayValue(teamName) && { label: "Team name", value: teamName },
    hasDisplayValue(position) && { label: "Position", value: position },
    hasDisplayValue(jerseyNumber) && { label: "Jersey number", value: jerseyNumber },
    hasDisplayValue(gradYear) && { label: "Graduation year", value: String(gradYear) },
  ];

  const cardRows = [
    { label: "Card type", value: cardTypeLabel },
    showAnimatedLine &&
      animationSummaryValue && {
        label: animationSummaryLabel,
        value: animationSummaryValue,
      },
    { label: "Pack", value: packLabel },
    hasDisplayValue(tierLabel) && { label: "Tier", value: tierLabel },
    hasDisplayValue(themeLabel) && { label: "Theme", value: themeLabel },
  ];

  const basePriceLabel =
    phase === "pay-upfront" && !isHighlight && showAnimatedLine && animateAtCheckout
      ? "Base price"
      : isHighlight
        ? `${tierLabel || "Card"} price`
        : tierCardLabel;

  return (
    <div className="rounded-xl border border-white/10 bg-cardBg2 p-4 text-sm text-slate-300 sm:p-5">
      <p className="text-base font-semibold text-white">Order Summary</p>
      <p className="mt-1 text-xs text-slate-500">Review your card details before confirming.</p>

      <SummarySection title="Player Info" rows={playerRows} />
      <SummarySection title="Card Details" rows={cardRows} />

      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Order Total</p>
        <div className="mt-2 rounded-lg border border-white/10 bg-cardBg/80 p-3">
          {isHighlight ? (
            <>
              <TotalLine label={basePriceLabel} value={formatMoney(basePrice)} />
              <TotalLine
                label="Highlight upgrade"
                value={formatMoney(highlightFee || Number(pricing.highlight_card_price) || 5)}
              />
            </>
          ) : (
            <>
              <TotalLine label={basePriceLabel} value={formatMoney(basePrice)} />
              {showAnimatedLine ? (
                <TotalLine
                  label={isAnimated && !animateAtCheckout ? "Animated" : "Animated upgrade"}
                  value={formatMoney(animatedFee)}
                />
              ) : null}
            </>
          )}
          <div className="mt-2 flex justify-between gap-4 border-t border-white/10 pt-2">
            <span className="font-semibold text-white">Total</span>
            <span className="text-base font-bold tabular-nums text-brand-gold">{formatMoney(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
