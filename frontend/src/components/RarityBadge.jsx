import React from "react";
import { getRarityBadgeConfig, shouldShowRarityBadge } from "../utils/rarityStyles";

function PenIcon() {
  return (
    <svg
      className="rarity-badge__icon"
      viewBox="0 0 12 12"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8.5 1.5l2 2L4.5 9.5 2 10l.5-2.5L8.5 1.5z" />
    </svg>
  );
}

export default function RarityBadge({ rarity, className = "", size = "default" }) {
  if (!shouldShowRarityBadge(rarity)) return null;
  const config = getRarityBadgeConfig(rarity);
  if (!config.show) return null;

  return (
    <span
      className={`${config.className} rarity-badge--${size} ${className}`.trim()}
      aria-label={`${config.text} rarity`}
    >
      {config.icon === "pen" ? <PenIcon /> : null}
      {config.text}
    </span>
  );
}
