import { normalizeTierKey } from "./cardTemplate";

/** Vault product tiers — accepts rookie | all_star | allstar | base | rare | legends | legendary */
export function vaultTierBadge(tier) {
  const key = normalizeTierKey(tier);
  if (key === "legends") {
    return {
      label: "Legends",
      glow: "shadow-[0_0_28px_rgba(201,168,76,0.4)] border-[#C9A84C]/50",
      pill: "border-[#C9A84C]/60 bg-[#C9A84C]/15 text-[#E8C56A]",
      accent: "#C9A84C",
    };
  }
  if (key === "allstar") {
    return {
      label: "All-Star",
      glow: "shadow-[0_0_26px_rgba(26,106,181,0.4)] border-[#1A6AB5]/50",
      pill: "border-[#1A6AB5]/60 bg-[#1A6AB5]/15 text-blue-100",
      accent: "#1A6AB5",
    };
  }
  return {
    label: "Rookie",
    glow: "shadow-[0_0_26px_rgba(74,138,26,0.4)] border-[#4A8A1A]/50",
    pill: "border-[#4A8A1A]/60 bg-[#4A8A1A]/15 text-green-100",
    accent: "#4A8A1A",
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
  return `${e} of ${p}`;
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
