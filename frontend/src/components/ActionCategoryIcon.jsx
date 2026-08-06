import React from "react";

const ICONS = {
  /** Pitcher in wind-up — raised leg, arm back overhead */
  pitching: (
    <>
      <circle cx="24" cy="9" r="4" />
      <path d="M24 13 L24 26" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M24 17 L14 12" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M24 16 L34 10" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M24 26 L20 38" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M18 30 L12 18" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </>
  ),
  /** Field throw — upright, stepping forward, horizontal arm extension */
  throwing: (
    <>
      <circle cx="22" cy="10" r="4" />
      <path d="M22 14 L22 28" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M22 20 L36 18" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M22 19 L10 22" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M22 28 L16 38" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M22 28 L30 38" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </>
  ),
  hitting: (
    <>
      <circle cx="20" cy="12" r="4" />
      <path d="M20 16 L20 32 M20 24 L28 32 M20 32 L16 40 M20 32 L24 40" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M32 20 L44 8" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  fielding: (
    <>
      <circle cx="36" cy="28" r="4" />
      <path d="M36 32 L28 36 M36 32 L40 36" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M12 32 L28 32 L36 28" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 32 L24 38 M28 32 L32 38" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  catching: (
    <>
      <circle cx="24" cy="14" r="4" />
      <path d="M16 24 Q24 20 32 24" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M18 24 L16 34 M30 24 L32 34" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M20 34 L28 34" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="34" cy="26" rx="5" ry="4" />
    </>
  ),
  celebrating: (
    <>
      <circle cx="24" cy="14" r="4" />
      <path d="M24 18 L24 32" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 22 L14 12 M24 22 L34 12" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 32 L18 40 M24 32 L30 40" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
};

export default function ActionCategoryIcon({ categoryId, className = "", style = undefined }) {
  const content = ICONS[categoryId];
  if (!content) return null;

  return (
    <svg
      viewBox="0 0 48 48"
      width="48"
      height="48"
      className={className}
      style={style}
      aria-hidden
      fill="currentColor"
      stroke="currentColor"
    >
      {content}
    </svg>
  );
}
