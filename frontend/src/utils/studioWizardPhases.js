export const STUDIO_PHASES = [
  {
    id: 1,
    name: "Card Setup",
    hype: "Choose your card type and style",
    title: "Card Setup",
    subtitle: "Choose your card type and style",
  },
  {
    id: 2,
    name: "Player Info",
    hype: "Tell us about your player",
    title: "Player Info",
    subtitle: "Tell us about your player",
  },
  {
    id: 3,
    name: "Photo & Preview",
    hype: "Almost there — let's create your legend",
    title: "Photo & Preview",
    subtitle: "Almost there — let's create your legend",
  },
];

/** Map wizard step number to phase id (1–3). */
export function getStudioPhase(step) {
  if (step <= 4) return 1;
  if (step <= 6) return 2;
  return 3;
}

export function getPhaseMeta(step) {
  const phase = getStudioPhase(step);
  return STUDIO_PHASES.find((p) => p.id === phase) || STUDIO_PHASES[0];
}

export const WIZARD_STEP_CARD_TYPE = 1;
export const WIZARD_STEP_TIER = 2;

const CARD_TYPE_CONTINUE_LABELS = {
  standard: "Static",
  highlight: "Highlight",
  animated: "Animated",
};

export function getPhaseContinueLabel(
  step,
  { isReview = false, cardType = "standard", tierLabel = "Rookie" } = {},
) {
  const phase = getStudioPhase(step);
  if (isReview) return "Create My Card ⚡";
  if (step === WIZARD_STEP_CARD_TYPE) {
    const typeKey = cardType || "standard";
    return `Continue with ${CARD_TYPE_CONTINUE_LABELS[typeKey] || "Static"} →`;
  }
  if (step === WIZARD_STEP_TIER) {
    return `Continue with ${tierLabel || "Rookie"} →`;
  }
  if (phase === 2) return "Add Your Photo →";
  return "Continue →";
}
