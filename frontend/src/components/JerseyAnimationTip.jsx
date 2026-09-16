import React from "react";

export default function JerseyAnimationTip({ className = "" }) {
  return (
    <div className={`jersey-animation-tip${className ? ` ${className}` : ""}`} role="note">
      <span className="jersey-animation-tip__icon" aria-hidden>
        ⚡
      </span>
      <p className="jersey-animation-tip__text">
        <strong>Tip:</strong> For best results, make sure your jersey&apos;s team name or logo is clearly visible in
        the original photo. If not visible, the AI will generate a generic uniform design.
      </p>
    </div>
  );
}
