import React from "react";
import { Link } from "react-router-dom";
import { generationCapFriendlyMessage } from "../utils/generationUsage";

export default function GenerationCapNotice({ usage, period, className = "" }) {
  const message = generationCapFriendlyMessage(usage, period);
  if (!message) return null;

  const isMonthly = (period || usage?.cap_hit) === "monthly";

  return (
    <div
      className={`rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-4 text-sm leading-relaxed text-amber-50 ${className}`}
      role="status"
    >
      <p>{message}</p>
      {isMonthly ? (
        <div className="mt-3 flex flex-wrap gap-3 text-sm font-medium">
          <Link to="/my-collection" className="text-brand-gold underline underline-offset-2">
            My Collection
          </Link>
          <Link to="/marketplace" className="text-brand-gold underline underline-offset-2">
            Marketplace
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export function GenerationDailyUsageHint({ usage, className = "" }) {
  const count = Number(usage?.daily_count);
  if (!Number.isFinite(count) || count < 1) return null;
  const label = count === 1 ? "1 card generated today" : `${count} cards generated today`;
  return (
    <p className={`text-[12px] ${className}`} style={{ color: "var(--text-muted)" }}>
      {label}
    </p>
  );
}
