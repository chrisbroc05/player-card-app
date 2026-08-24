import React from "react";
import { RARITY_KEYS, normalizeRarityKey } from "../utils/rarityStyles";
import StandardReveal from "./rarityReveals/StandardReveal";
import FoilReveal from "./rarityReveals/FoilReveal";
import RefractorReveal from "./rarityReveals/RefractorReveal";
import GoldAutoReveal from "./rarityReveals/GoldAutoReveal";
import OneOfOneReveal from "./rarityReveals/OneOfOneReveal";
import BlackLabelReveal from "./rarityReveals/BlackLabelReveal";
import "../styles/rarityRevealExperience.css";

export default function RevealOrchestrator({
  rarity = "standard",
  revealCard,
  playerName = "",
  showActions = false,
  primaryActionLabel = "Add to Collection",
  onPrimaryAction,
  onGenerateAnother,
  onStartOver,
  celebrationMessage = "",
}) {
  const key = normalizeRarityKey(rarity || revealCard?.rarity);
  const resetKey = `${revealCard?.card_id}-${revealCard?.image_url}`;
  const shared = {
    revealCard,
    playerName,
    showActions,
    primaryActionLabel,
    onPrimaryAction,
    onGenerateAnother,
    onStartOver,
    celebrationMessage,
  };

  return (
    <div className="reveal-orchestrator" key={resetKey}>
      {key === RARITY_KEYS.FOIL ? <FoilReveal {...shared} /> : null}
      {key === RARITY_KEYS.REFRACTOR ? <RefractorReveal {...shared} /> : null}
      {key === RARITY_KEYS.GOLD_AUTO ? <GoldAutoReveal {...shared} /> : null}
      {key === RARITY_KEYS.ONE_OF_ONE ? <OneOfOneReveal {...shared} /> : null}
      {key === RARITY_KEYS.BLACK_LABEL ? <BlackLabelReveal {...shared} /> : null}
      {key === RARITY_KEYS.STANDARD || !Object.values(RARITY_KEYS).includes(key) ? (
        <StandardReveal {...shared} />
      ) : null}
    </div>
  );
}
