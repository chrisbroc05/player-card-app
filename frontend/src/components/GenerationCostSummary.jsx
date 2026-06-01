import React from "react";
import { Link } from "react-router-dom";
import { formatMoney } from "../utils/marketplace";
import { copyChargeForQuantity, normalizeCopyTiers } from "../utils/copyPricing";

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

function TotalLine({ label, value, highlight = false, free = false }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <span className="text-slate-300">{label}</span>
      <span
        className={`font-medium tabular-nums ${
          free ? "text-emerald-300" : highlight ? "text-neonTeal" : "text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function GenerationCostSummary({
  playerName,
  teamName,
  position,
  jerseyNumber,
  gradYear,
  tierLabel,
  themeLabel,
  isAnimated,
  motionName,
  copyQuantity = 1,
  pricing,
  creditBalance,
  showBalance = true,
  phase = "pre-generate",
}) {
  if (!pricing) return null;

  const animated = Number(pricing.animated_upgrade_price) || 0;
  const copyTiers = normalizeCopyTiers(pricing.copy_pricing_tiers);
  const balance = Number(creditBalance) || 0;
  const copies = Math.max(1, Number(copyQuantity) || 1);
  const copyCharge = copyChargeForQuantity(copies, 1, copyTiers);
  const { extra: extraCopies, unit: copyUnitPrice, total: extraCopyCost } = copyCharge;

  const cardTypeLabel = isAnimated ? "Animated" : "Static";

  const playerRows = [
    hasDisplayValue(playerName) && { label: "Player name", value: playerName },
    hasDisplayValue(teamName) && { label: "Team name", value: teamName },
    hasDisplayValue(position) && { label: "Position", value: position },
    hasDisplayValue(jerseyNumber) && { label: "Jersey number", value: jerseyNumber },
    hasDisplayValue(gradYear) && { label: "Graduation year", value: String(gradYear) },
  ];

  const cardRows = [
    hasDisplayValue(tierLabel) && { label: "Card tier", value: tierLabel },
    hasDisplayValue(themeLabel) && { label: "Theme", value: themeLabel },
    { label: "Card type", value: cardTypeLabel },
    isAnimated && hasDisplayValue(motionName) && { label: "Motion", value: motionName },
    { label: "Copies", value: String(copies) },
    extraCopies > 0 && {
      label: "Copy rate applied",
      value: `${formatMoney(copyUnitPrice)} each`,
    },
  ];

  let totalDue = 0;
  if (phase === "pre-generate") {
    totalDue = isAnimated ? animated : 0;
  } else {
    totalDue = extraCopyCost;
  }

  const shortfall = Math.max(0, totalDue - balance);

  return (
    <div className="rounded-xl border border-white/10 bg-cardBg2 p-4 text-sm text-slate-300 sm:p-5">
      <p className="text-base font-semibold text-white">Order Summary</p>
      <p className="mt-1 text-xs text-slate-500">Review your card details before confirming.</p>

      <SummarySection title="Player Info" rows={playerRows} />
      <SummarySection title="Card Details" rows={cardRows} />

      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Order Total</p>
        <div className="mt-2 rounded-lg border border-white/10 bg-cardBg/80 p-3">
          {phase === "pre-generate" ? (
            <>
              <TotalLine label="First preview" value="FREE" free />
              {isAnimated ? (
                <TotalLine label="Animated upgrade" value={formatMoney(animated)} />
              ) : (
                <TotalLine label="Standard card" value="FREE" free />
              )}
              {extraCopies > 0 ? (
                <TotalLine
                  label={`Additional copies (${extraCopies})`}
                  value={formatMoney(extraCopyCost)}
                />
              ) : null}
            </>
          ) : (
            <>
              <TotalLine label="First card (from preview)" value="Included" free />
              {extraCopies > 0 ? (
                <>
                  <TotalLine label="Copy rate applied" value={`${formatMoney(copyUnitPrice)} each`} />
                  <TotalLine
                    label={`Copy subtotal (${extraCopies} ${extraCopies === 1 ? "copy" : "copies"})`}
                    value={formatMoney(extraCopyCost)}
                  />
                </>
              ) : (
                <TotalLine label="Copy subtotal" value={formatMoney(0)} />
              )}
              {isAnimated ? (
                <TotalLine label="Animated upgrade" value="Paid at preview" free />
              ) : null}
            </>
          )}
          <div className="mt-2 flex justify-between gap-4 border-t border-white/10 pt-2">
            <span className="font-semibold text-white">
              {phase === "confirm" ? "Total due on confirm" : "Total due now"}
            </span>
            <span className="text-base font-bold tabular-nums text-neonTeal">
              {totalDue <= 0 ? "FREE" : formatMoney(totalDue)}
            </span>
          </div>
        </div>
      </div>

      {showBalance ? (
        <p className="mt-3 text-sm">
          Your credit balance:{" "}
          <span className="font-semibold tabular-nums text-neonTeal">{formatMoney(balance)}</span>
        </p>
      ) : null}

      {shortfall > 0 ? (
        <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
          <p className="font-medium text-amber-50">
            You need {formatMoney(totalDue)} in credits to continue.
          </p>
          <p className="mt-1">Your current balance: {formatMoney(balance)}</p>
          <p className="mt-1">You need {formatMoney(shortfall)} more.</p>
          <Link
            to="/credits"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex min-h-[40px] items-center justify-center rounded-lg bg-neonTeal px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Add Credits
          </Link>
        </div>
      ) : null}
    </div>
  );
}
