/** Vault product tiers from API: rookie | allstar | legends */

export function vaultTierBadge(tier) {
  const t = (tier || "").toLowerCase();
  if (t === "legends") {
    return {
      label: "Legends",
      glow: "shadow-[0_0_28px_rgba(255,215,0,0.35)] border-amber-400/50",
      pill: "border-amber-400/60 bg-amber-400/15 text-amber-100",
      accent: "#ffd700",
    };
  }
  if (t === "allstar") {
    return {
      label: "All-Star",
      glow: "shadow-[0_0_26px_rgba(0,170,255,0.35)] border-cyan-400/50",
      pill: "border-cyan-400/60 bg-cyan-400/15 text-cyan-100",
      accent: "#00aaff",
    };
  }
  return {
    label: "Rookie",
    glow: "shadow-[0_0_26px_rgba(255,69,0,0.35)] border-orange-500/50",
    pill: "border-orange-400/60 bg-orange-500/15 text-orange-100",
    accent: "#ff4500",
  };
}

export function formatEdition(editionNumber, printRun) {
  const e = Number(editionNumber) || 1;
  const p = Number(printRun) || 1;
  return `Copy #${e} of ${p}`;
}

export function formatEditionShort(editionNumber, printRun) {
  const e = Number(editionNumber) || 1;
  const p = Number(printRun) || 1;
  return `#${e} of ${p}`;
}

export function rarityDisplay(rarity) {
  const r = (rarity || "").toLowerCase();
  if (r === "legendary") return "Legendary";
  if (r === "rare") return "Rare";
  return "Common";
}

/** Hashtag segment (no #) matching backend share text, e.g. AllStarCard */
export function tierShareHashtagKey(tier) {
  const t = (tier || "").toLowerCase().replace(/-/g, "").replace(/_/g, "");
  if (t === "legends") return "Legends";
  if (t === "allstar") return "AllStar";
  return "Rookie";
}
