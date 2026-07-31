import React from "react";

/** Theme-specific corner overlays and badges for highlight cards. */
export default function HighlightThemeDecor({ themeKey }) {
  if (!themeKey || themeKey === "default") return null;

  return (
    <div className={`highlight-card__decor highlight-card__decor--${themeKey}`} aria-hidden>
      {themeKey === "mvp" ? <span className="highlight-card__trophy">🏆</span> : null}

      {themeKey === "diamond" ? (
        <>
          <span className="highlight-card__gem highlight-card__gem--tl" />
          <span className="highlight-card__gem highlight-card__gem--tr" />
          <span className="highlight-card__gem highlight-card__gem--bl" />
          <span className="highlight-card__gem highlight-card__gem--br" />
        </>
      ) : null}

      {themeKey === "hall_of_fame" ? (
        <>
          <span className="highlight-card__hof-badge">HOF</span>
          <span className="highlight-card__ribbon" />
        </>
      ) : null}

      {themeKey === "rookie_of_the_year" ? (
        <>
          <span className="highlight-card__star highlight-card__star--tl">★</span>
          <span className="highlight-card__star highlight-card__star--tr">★</span>
          <span className="highlight-card__star highlight-card__star--bl">★</span>
          <span className="highlight-card__star highlight-card__star--br">★</span>
          <span className="highlight-card__roy-badge">ROY</span>
        </>
      ) : null}

      {themeKey === "captain" ? (
        <>
          <span className="highlight-card__anchor">⚓</span>
          <span className="highlight-card__captain-badge">C</span>
        </>
      ) : null}

      {themeKey === "inferno" ? <span className="highlight-card__flame" /> : null}

      {themeKey === "holographic" ? <span className="highlight-card__holo-shimmer" /> : null}
    </div>
  );
}
