export const STUDIO_PHASES = [
  {
    id: 1,
    name: "Player Info",
    hype: "Tell us about your player",
    title: "Player Info",
    subtitle: "Tell us about your player",
  },
  {
    id: 2,
    name: "Card Style",
    hype: "Design your card",
    title: "Card Style",
    subtitle: "Design your card",
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
  if (step <= 1) return 1;
  if (step <= 4) return 2;
  return 3;
}

export function getPhaseMeta(step) {
  const phase = getStudioPhase(step);
  return STUDIO_PHASES.find((p) => p.id === phase) || STUDIO_PHASES[0];
}

export function getPhaseContinueLabel(step, { isReview = false } = {}) {
  const phase = getStudioPhase(step);
  if (isReview) return "Create My Card ⚡";
  if (phase === 1) return "Choose Your Style →";
  if (phase === 2) return "Add Your Photo →";
  return "Continue →";
}
