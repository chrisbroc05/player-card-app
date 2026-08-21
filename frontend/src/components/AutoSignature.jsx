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
    <div
      className={`auto-signature pointer-events-none absolute inset-x-0 bottom-[8%] z-[4] flex flex-col items-center ${className}`.trim()}
      aria-hidden
    >
      <span
        className={`signature-text ${animate ? "signature-text--animate" : ""}`}
      >
        {playerName}
      </span>
      <span className="certified-text">CERTIFIED AUTO</span>
    </div>
  );
}
