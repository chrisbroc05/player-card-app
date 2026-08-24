import React from "react";
import { getSignatureLabel, getSignatureLabelColor, hasAutoSignature } from "../utils/rarityStyles";

export default function AutoSignature({
  playerName,
  rarity,
  animate = false,
  className = "",
}) {
  const label = getSignatureLabel(rarity);
  if (!hasAutoSignature(rarity) || !playerName || !label) return null;

  return (
    <div className={`auto-signature pointer-events-none ${className}`.trim()} aria-hidden>
      <span className={`signature-text ${animate ? "signature-text--animate" : ""}`}>
        {playerName}
      </span>
      <span
        className="certified-auto-text"
        style={{ color: getSignatureLabelColor(rarity) }}
      >
        {label}
      </span>
    </div>
  );
}
