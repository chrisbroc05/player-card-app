import React from "react";

export const AI_ANIMATION_DISCLAIMER =
  "AI animations may not perfectly replicate all card details such as jersey numbers or text when the player turns. This is a normal limitation of AI video generation.";

export default function AnimatedAiDisclaimer({ className = "" }) {
  return (
    <p className={`text-xs leading-relaxed text-slate-500 ${className}`.trim()}>
      {AI_ANIMATION_DISCLAIMER}
    </p>
  );
}
