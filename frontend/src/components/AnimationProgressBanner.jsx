import React from "react";

export default function AnimationProgressBanner({ variant = "progress", message }) {
  const isProgress = variant === "progress";
  const isSuccess = variant === "success";
  const isFailed = variant === "failed";

  let text = message;
  if (!text) {
    if (isSuccess) text = "Animation complete! ✨";
    else if (isFailed) text = "Animation failed. Try again.";
    else text = "Animation in progress... We'll notify you when ready";
  }

  return (
    <div
      className={`mt-2 rounded-lg border px-3 py-2 text-xs font-medium ${
        isSuccess
          ? "border-[var(--color-success)]/40 bg-success-subtle text-success"
          : isFailed
            ? "border-rose-400/35 bg-rose-500/10 text-rose-100"
            : "animation-banner-pulse border-violet-400/35 bg-violet-500/10 text-violet-100"
      }`}
    >
      {text}
    </div>
  );
}
