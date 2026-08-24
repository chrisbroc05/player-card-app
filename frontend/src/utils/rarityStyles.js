/** Rarity keys aligned with backend pull system */

export const RARITY_KEYS = {
  STANDARD: "standard",
  FOIL: "foil",
  REFRACTOR: "refractor",
  GOLD_AUTO: "gold_auto",
  ONE_OF_ONE: "one_of_one",
  BLACK_LABEL: "black_label",
};

const LEGACY_MAP = {
  base: RARITY_KEYS.STANDARD,
  common: RARITY_KEYS.STANDARD,
  rare: RARITY_KEYS.REFRACTOR,
  legendary: RARITY_KEYS.GOLD_AUTO,
};

export function normalizeRarityKey(rarity) {
  const r = String(rarity || "standard")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
  if (LEGACY_MAP[r]) return LEGACY_MAP[r];
  if (Object.values(RARITY_KEYS).includes(r)) return r;
  return RARITY_KEYS.STANDARD;
}

/** Higher = rarer (marketplace default sort) */
export const RARITY_SORT_WEIGHT = {
  [RARITY_KEYS.STANDARD]: 0,
  [RARITY_KEYS.FOIL]: 1,
  [RARITY_KEYS.REFRACTOR]: 2,
  [RARITY_KEYS.GOLD_AUTO]: 3,
  [RARITY_KEYS.ONE_OF_ONE]: 4,
  [RARITY_KEYS.BLACK_LABEL]: 5,
};

export function raritySortWeight(rarity) {
  return RARITY_SORT_WEIGHT[normalizeRarityKey(rarity)] ?? 0;
}

export function shouldShowRarityBadge(rarity) {
  return normalizeRarityKey(rarity) !== RARITY_KEYS.STANDARD;
}

/** Foil gets enhanced reveal but no badge on card */
export function getRevealTier(rarity) {
  return normalizeRarityKey(rarity);
}

export function isPremiumRarityReveal(rarity) {
  const key = normalizeRarityKey(rarity);
  return (
    key === RARITY_KEYS.GOLD_AUTO ||
    key === RARITY_KEYS.ONE_OF_ONE ||
    key === RARITY_KEYS.BLACK_LABEL
  );
}

export function hasAutoSignature(rarity) {
  const key = normalizeRarityKey(rarity);
  return (
    key === RARITY_KEYS.GOLD_AUTO ||
    key === RARITY_KEYS.ONE_OF_ONE ||
    key === RARITY_KEYS.BLACK_LABEL
  );
}

export function getSignatureLabel(rarity) {
  const key = normalizeRarityKey(rarity);
  switch (key) {
    case RARITY_KEYS.GOLD_AUTO:
      return "CERTIFIED AUTO";
    case RARITY_KEYS.ONE_OF_ONE:
      return "1 OF 1";
    case RARITY_KEYS.BLACK_LABEL:
      return "BLACK LABEL";
    default:
      return null;
  }
}

export function getSignatureLabelColor(rarity) {
  const key = normalizeRarityKey(rarity);
  switch (key) {
    case RARITY_KEYS.ONE_OF_ONE:
      return "#FF4444";
    case RARITY_KEYS.BLACK_LABEL:
      return "#FFD700";
    default:
      return "#c9a84c";
  }
}

export function shouldShowThemeIcon(rarity) {
  return !hasAutoSignature(rarity);
}

export function getRarityBadgeConfig(rarity) {
  const key = normalizeRarityKey(rarity);
  switch (key) {
    case RARITY_KEYS.FOIL:
      return {
        text: "FOIL",
        className: "rarity-badge rarity-badge--foil",
        show: true,
      };
    case RARITY_KEYS.REFRACTOR:
      return {
        text: "REFRACTOR",
        thumbText: "REF",
        className: "rarity-badge rarity-badge--refractor",
        show: true,
      };
    case RARITY_KEYS.GOLD_AUTO:
      return {
        text: "AUTO",
        className: "rarity-badge rarity-badge--gold-auto",
        show: true,
        icon: "pen",
      };
    case RARITY_KEYS.ONE_OF_ONE:
      return {
        text: "1 OF 1",
        className: "rarity-badge rarity-badge--one-of-one",
        show: true,
      };
    case RARITY_KEYS.BLACK_LABEL:
      return {
        text: "BLACK LABEL",
        className: "rarity-badge rarity-badge--black-label",
        show: true,
      };
    default:
      return { text: "", className: "", show: false };
  }
}

export function getRevealConfig(rarity) {
  const key = normalizeRarityKey(rarity);
  switch (key) {
    case RARITY_KEYS.REFRACTOR:
      return {
        preBlackoutMs: 0,
        revealMs: 6000,
        landedMs: 5200,
        confettiMs: 0,
        sceneClass: "cce-scene--reveal-refractor",
        title: "Refractor Pull!",
        subtitle: "",
        variant: "shimmer",
        particleTheme: "refractor",
      };
    case RARITY_KEYS.GOLD_AUTO:
      return {
        preBlackoutMs: 0,
        revealMs: 8000,
        landedMs: 6800,
        confettiMs: 0,
        sceneClass: "cce-scene--reveal-gold-auto",
        title: "Gold Auto Pull!",
        subtitle: "This is your rarest card yet",
        variant: "flip",
        particleTheme: "gold",
        animateSignature: true,
      };
    case RARITY_KEYS.ONE_OF_ONE:
      return {
        preBlackoutMs: 0,
        revealMs: 9000,
        landedMs: 7800,
        confettiMs: 4000,
        sceneClass: "cce-scene--reveal-one-of-one",
        title: "1 OF 1 PULL",
        subtitle: "This card will never be created again",
        variant: "slam",
        particleTheme: "legendary",
        screenShake: true,
      };
    case RARITY_KEYS.BLACK_LABEL:
      return {
        preBlackoutMs: 0,
        revealMs: 12000,
        landedMs: 10000,
        confettiMs: 0,
        sceneClass: "cce-scene--reveal-black-label",
        title: "BLACK LABEL",
        subtitle: "The rarest card in existence",
        variant: "materialize",
        particleTheme: "black-label",
        permanentGlow: true,
        animateSignature: true,
      };
    case RARITY_KEYS.FOIL:
      return {
        preBlackoutMs: 0,
        revealMs: 5000,
        landedMs: 4200,
        confettiMs: 0,
        sceneClass: "cce-scene--reveal-foil",
        title: "Foil Pull!",
        subtitle: "",
        variant: "bounce",
        particleTheme: "foil",
      };
    default:
      return {
        preBlackoutMs: 0,
        revealMs: 4800,
        landedMs: 4200,
        confettiMs: 2000,
        sceneClass: "",
        title: "Your card is ready!",
        subtitle: "",
        variant: "bounce",
        particleTheme: "standard",
      };
  }
}

export function forgeLoadingMessage(rarity, elapsedMs, generationComplete) {
  const key = normalizeRarityKey(rarity);
  if (!generationComplete && elapsedMs < 5000) return null;
  if (elapsedMs >= 5000 && key === RARITY_KEYS.BLACK_LABEL) {
    return "A legend has been born...";
  }
  if (elapsedMs >= 5000 && key === RARITY_KEYS.ONE_OF_ONE) {
    return "Wait... something incredible is happening...";
  }
  if (elapsedMs >= 5000 && (key === RARITY_KEYS.GOLD_AUTO || key === RARITY_KEYS.BLACK_LABEL)) {
    return "Something special is happening...";
  }
  return null;
}

export function rarityDisplayLabel(rarity, apiName) {
  const fromApi = String(apiName || "").trim();
  if (fromApi) return fromApi;
  const key = normalizeRarityKey(rarity);
  const labels = {
    [RARITY_KEYS.STANDARD]: "Base",
    [RARITY_KEYS.FOIL]: "Foil",
    [RARITY_KEYS.REFRACTOR]: "Refractor",
    [RARITY_KEYS.GOLD_AUTO]: "Gold Auto",
    [RARITY_KEYS.ONE_OF_ONE]: "1 of 1",
    [RARITY_KEYS.BLACK_LABEL]: "Black Label",
  };
  return labels[key] || "Base";
}

export function getRevealCelebrationMessage(rarity) {
  const key = normalizeRarityKey(rarity);
  switch (key) {
    case RARITY_KEYS.GOLD_AUTO:
      return "Congratulations on your Gold Auto Pull!";
    case RARITY_KEYS.ONE_OF_ONE:
      return "This card will never be created again";
    case RARITY_KEYS.BLACK_LABEL:
      return "You pulled the rarest card in existence.";
    default:
      return "";
  }
}

export const REVEAL_PULL_MESSAGES = {
  [RARITY_KEYS.FOIL]: { title: "Foil Pull!" },
  [RARITY_KEYS.REFRACTOR]: { title: "Refractor Pull!", subtitle: "1 in 14 cards" },
  [RARITY_KEYS.GOLD_AUTO]: { title: "Gold Auto Pull!" },
  [RARITY_KEYS.ONE_OF_ONE]: {
    title: "1 OF 1 Pull!",
    subtitle: "Incredibly rare",
    extra: "This card will never be created again",
  },
  [RARITY_KEYS.BLACK_LABEL]: {
    title: "BLACK LABEL",
    subtitle: "The rarest card in existence",
    extra: "Pull rate: 0.1% — rarer than a hole in one",
  },
};

export function getRevealPullMessage(rarity) {
  const key = normalizeRarityKey(rarity);
  return REVEAL_PULL_MESSAGES[key] || null;
}

export function formatRarityBreakdownLine(rarityCounts) {
  if (!rarityCounts || typeof rarityCounts !== "object") return "";
  const parts = [];
  const order = [
    [RARITY_KEYS.FOIL, "Foil"],
    [RARITY_KEYS.REFRACTOR, "Refractor"],
    [RARITY_KEYS.GOLD_AUTO, "Auto"],
    [RARITY_KEYS.ONE_OF_ONE, "1 of 1"],
    [RARITY_KEYS.BLACK_LABEL, "Black Label"],
  ];
  for (const [key, label] of order) {
    const count = Number(rarityCounts[key] || 0);
    if (count > 0) parts.push(`${count} ${label}`);
  }
  return parts.join(" · ");
}

export function isPremiumRarity(rarity) {
  return raritySortWeight(rarity) >= raritySortWeight(RARITY_KEYS.REFRACTOR);
}

export const MARKETPLACE_RARITY_FILTER_OPTIONS = [
  { value: "", label: "All rarities" },
  { value: "foil", label: "Foil" },
  { value: "refractor", label: "Refractor" },
  { value: "gold_auto", label: "Auto" },
  { value: "one_of_one", label: "1 of 1" },
  { value: "black_label", label: "Black Label" },
];
