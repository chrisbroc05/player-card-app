import React, { useEffect, useState } from "react";
import { RARITY_KEYS, normalizeRarityKey } from "../../utils/rarityStyles";

export const RARITY_STAMP_CONFIG = {
  [RARITY_KEYS.STANDARD]: {
    text: "BASE",
    color: "#FFFFFF",
    shadowColor: "rgba(255,255,255,0.5)",
    bgFlash: "transparent",
    animation: "fade",
    fontSize: "clamp(48px, 10vw, 80px)",
  },
  [RARITY_KEYS.FOIL]: {
    text: "FOIL",
    color: "#E8C56A",
    shadowColor: "rgba(232,197,106,0.8)",
    bgFlash: "rgba(232,197,106,0.15)",
    animation: "slide-down",
    fontSize: "clamp(56px, 12vw, 90px)",
  },
  [RARITY_KEYS.REFRACTOR]: {
    text: "REFRACTOR",
    color: "#85B7EB",
    shadowColor: "rgba(133,183,235,0.8)",
    bgFlash: "rgba(133,183,235,0.2)",
    animation: "slam-left",
    fontSize: "clamp(48px, 11vw, 85px)",
  },
  [RARITY_KEYS.GOLD_AUTO]: {
    text: "AUTO",
    color: "#FFD700",
    shadowColor: "rgba(255,215,0,0.8)",
    bgFlash: "rgba(255,215,0,0.2)",
    animation: "slam",
    fontSize: "clamp(80px, 16vw, 130px)",
  },
  [RARITY_KEYS.ONE_OF_ONE]: {
    text: "1 OF 1",
    color: "#FF4444",
    shadowColor: "rgba(255,68,68,0.8)",
    bgFlash: "rgba(180,0,0,0.25)",
    animation: "typewriter",
    fontSize: "clamp(72px, 15vw, 120px)",
  },
  [RARITY_KEYS.BLACK_LABEL]: {
    text: "BLACK LABEL",
    color: "#FFD700",
    shadowColor: "rgba(255,215,0,0.9)",
    bgFlash: "rgba(0,0,0,0.85)",
    animation: "split-slam",
    fontSize: "clamp(56px, 12vw, 100px)",
  },
};

function TypewriterStamp({ text, className, style }) {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    setVisible(0);
    let i = 0;
    const iv = window.setInterval(() => {
      i += 1;
      setVisible(i);
      if (i >= text.length) window.clearInterval(iv);
    }, 80);
    return () => window.clearInterval(iv);
  }, [text]);

  return (
    <span className={className} style={style}>
      {text.split("").map((ch, idx) => (
        <span key={`${ch}-${idx}`} style={{ opacity: idx < visible ? 1 : 0 }}>
          {ch}
        </span>
      ))}
    </span>
  );
}

function SplitSlamStamp({ color, shadowColor, fontSize }) {
  return (
    <div className="rarity-stamp-split" style={{ fontSize, color, "--shadowColor": shadowColor }}>
      <span className="rarity-stamp-split__word rarity-stamp-split__word--top">BLACK</span>
      <span className="rarity-stamp-split__word rarity-stamp-split__word--bottom">LABEL</span>
    </div>
  );
}

export default function RarityStamp({ active = false, rarity = "standard" }) {
  if (!active) return null;

  const key = normalizeRarityKey(rarity);
  const config = RARITY_STAMP_CONFIG[key];
  if (!config) return null;

  const style = {
    "--bgFlash": config.bgFlash,
    "--stampColor": config.color,
    "--shadowColor": config.shadowColor,
    "--stampSize": config.fontSize,
  };

  if (config.animation === "split-slam") {
    return (
      <div className="rarity-stamp rarity-stamp-overlay rarity-stamp--split-slam" aria-hidden style={style}>
        <SplitSlamStamp color={config.color} shadowColor={config.shadowColor} fontSize={config.fontSize} />
      </div>
    );
  }

  const textClass = `rarity-stamp-text rarity-stamp-text--${config.animation}`;

  return (
    <div className={`rarity-stamp rarity-stamp-overlay rarity-stamp--${config.animation}`} aria-hidden style={style}>
      {config.animation === "typewriter" ? (
        <TypewriterStamp text={config.text} className={`${textClass} rarity-stamp-text--shake`} style={{ fontSize: config.fontSize }} />
      ) : (
        <span className={textClass} style={{ fontSize: config.fontSize }}>
          {config.text}
        </span>
      )}
    </div>
  );
}
