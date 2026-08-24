import React from "react";
import { RARITY_KEYS, normalizeRarityKey } from "../utils/rarityStyles";
import StandardReveal from "./rarityReveals/StandardReveal";
import FoilReveal from "./rarityReveals/FoilReveal";
import RefractorReveal from "./rarityReveals/RefractorReveal";
import GoldAutoReveal from "./rarityReveals/GoldAutoReveal";
import OneOfOneReveal from "./rarityReveals/OneOfOneReveal";
import BlackLabelReveal from "./rarityReveals/BlackLabelReveal";
import "../styles/rarityRevealExperience.css";

export default function RarityRevealExperience({
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
  const key = normalizeRarityKey(rarity);
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

  switch (key) {
    case RARITY_KEYS.FOIL:
      return <FoilReveal {...shared} />;
    case RARITY_KEYS.REFRACTOR:
      return <RefractorReveal {...shared} />;
    case RARITY_KEYS.GOLD_AUTO:
      return <GoldAutoReveal {...shared} />;
    case RARITY_KEYS.ONE_OF_ONE:
      return <OneOfOneReveal {...shared} />;
    case RARITY_KEYS.BLACK_LABEL:
      return <BlackLabelReveal {...shared} />;
    case RARITY_KEYS.STANDARD:
    default:
      return <StandardReveal {...shared} />;
  }
}
