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

export function getPhaseContinueLabel(step, { isReview = false } = {}) {
  const phase = getStudioPhase(step);
  if (isReview) return "Create My Card ⚡";
  if (step === 1) return "Choose Your Tier →";
  if (phase === 1) return "Continue →";
  if (phase === 2) return "Add Your Photo →";
  return "Continue →";
}
