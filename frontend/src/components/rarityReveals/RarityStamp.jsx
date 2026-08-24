import React from "react";
import { normalizeRarityKey } from "../../utils/rarityStyles";

export const RARITY_STAMPS = {
  foil: {
    text: "FOIL",
    color: "#E8C56A",
    shadowColor: "rgba(232,197,106,0.8)",
    bgFlash: "rgba(232,197,106,0.15)",
  },
  refractor: {
    text: "REFRACTOR",
    color: "#85B7EB",
    shadowColor: "rgba(133,183,235,0.8)",
    bgFlash: "rgba(133,183,235,0.15)",
  },
  gold_auto: {
    text: "AUTO",
    color: "#FFD700",
    shadowColor: "rgba(255,215,0,0.8)",
    bgFlash: "rgba(255,215,0,0.2)",
  },
  one_of_one: {
    text: "1 OF 1",
    color: "#FF4444",
    shadowColor: "rgba(255,68,68,0.8)",
    bgFlash: "rgba(255,68,68,0.2)",
  },
  black_label: {
    text: "BLACK LABEL",
    color: "#FFD700",
    shadowColor: "rgba(255,215,0,0.9)",
    bgFlash: "rgba(0,0,0,0.8)",
  },
};

export default function RarityStamp({ active = false, rarity = "foil" }) {
  if (!active) return null;

  const key = normalizeRarityKey(rarity);
  const config = RARITY_STAMPS[key];
  if (!config) return null;

  return (
    <div
      className="rarity-stamp"
      aria-hidden
      style={{ "--bgFlash": config.bgFlash, "--stampColor": config.color, "--shadowColor": config.shadowColor }}
    >
      <span className="rarity-stamp-text">{config.text}</span>
    </div>
  );
}
