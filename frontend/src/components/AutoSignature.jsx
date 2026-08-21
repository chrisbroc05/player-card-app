import React from "react";
import { hasAutoSignature } from "../utils/rarityStyles";

export default function AutoSignature({
  playerName,
  rarity,
  animate = false,
  className = "",
}) {
  if (!hasAutoSignature(rarity) || !playerName) return null;

  return (
    <div className={`auto-signature pointer-events-none ${className}`.trim()} aria-hidden>
      <span className={`signature-text ${animate ? "signature-text--animate" : ""}`}>
        {playerName}
      </span>
      <span className="certified-auto-text">CERTIFIED AUTO</span>
    </div>
  );
}
