import React from "react";

/** Per-theme card backgrounds (visual identity); keyed by theme id from GET /themes */
const THEME_CARD_BACKGROUND = {
  neon: "linear-gradient(to bottom, #0a0a0a, #1a0a2e)",
  retro_vintage: "linear-gradient(to bottom, #2a1f0e, #1a1208)",
  chrome: "linear-gradient(to bottom, #1a1a2e, #2a2a3e)",
  holographic: "linear-gradient(125deg, #1a0a2e 0%, #0a2a1a 28%, #2e1a0a 52%, #1a1a3e 78%, #2e0a2e 100%)",
  midnight: "linear-gradient(to bottom, #0a0a1a, #0d0d2e)",
  inferno: "linear-gradient(to bottom, #1a0500, #2a0800)",
  spring_training: "linear-gradient(to bottom, #0a1a0a, #0d2010)",
  summer_slam: "linear-gradient(to bottom, #1a1000, #2a1a00)",
  halloween: "linear-gradient(to bottom, #1a0800, #0a0500)",
  christmas: "linear-gradient(to bottom, #0a1500, #150500)",
  fourth_of_july: "linear-gradient(to bottom, #0a0a1a, #1a0a0a)",
  new_year: "linear-gradient(to bottom, #0a0a00, #1a1a00)",
  gold_edition: "linear-gradient(to bottom, #1a1200, #2a1e00)",
  diamond: "linear-gradient(to bottom, #0a1020, #0d1530)",
  mvp: "linear-gradient(to bottom, #1a0a2e, #0a0a1a)",
  hall_of_fame: "linear-gradient(to bottom, #1a0e00, #2a1800)",
  rookie_of_the_year: "linear-gradient(to bottom, #0a0f1a, #0d1525)",
  captain: "linear-gradient(to bottom, #0a0f1a, #1a1200)",
};

const NEON_CARD_SHADOW =
  "inset 0 0 22px rgba(0, 255, 128, 0.14), inset 0 -12px 36px rgba(255, 20, 147, 0.1)";

function cardSurfaceStyle(themeId) {
  const background = THEME_CARD_BACKGROUND[themeId] || "linear-gradient(to bottom, #121212, #1a1a1a)";
  if (themeId === "neon") {
    return { background, boxShadow: NEON_CARD_SHADOW };
  }
  return { background };
}

const categoryHeaderStyle = {
  color: "#ffd700",
  fontSize: "13px",
  letterSpacing: "2px",
  textTransform: "uppercase",
  marginBottom: "16px",
};

export default function ThemeLibraryPicker({
  categories = [],
  loading = false,
  error = "",
  onRetry,
  value,
  onChange,
}) {
  function handlePick(themeId) {
    if (value === themeId) {
      onChange("");
      return;
    }
    onChange(themeId);
  }

  return (
    <div className="w-full">
      <header className="mb-6 text-center sm:text-left">
        <h2 className="text-xl font-semibold text-white sm:text-2xl">Choose Your Theme</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Select a theme to define the look and feel of your card
        </p>
      </header>

      {loading ? (
        <div
          className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-white/10 bg-cardBg2/60 py-12"
          role="status"
          aria-live="polite"
        >
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#ffd700]/30 border-t-[#ffd700]" />
          <p className="text-sm text-slate-400">Loading themes…</p>
        </div>
      ) : null}

      {!loading && error ? (
        <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-4 text-sm text-rose-100">
          <p>{error}</p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 rounded-lg border border-rose-400/40 bg-rose-500/20 px-3 py-2 text-xs font-medium text-rose-50 transition hover:bg-rose-500/30"
            >
              Try again
            </button>
          ) : null}
        </div>
      ) : null}

      {!loading && !error && categories.length === 0 ? (
        <p className="text-sm text-slate-400">No themes available.</p>
      ) : null}

      {!loading && !error && categories.length > 0 ? (
        <div className="flex flex-col gap-10">
          {categories.map((cat) => (
            <section key={cat.id} aria-labelledby={`theme-cat-${cat.id}`}>
              <h3 id={`theme-cat-${cat.id}`} className="font-semibold tracking-wide" style={categoryHeaderStyle}>
                {cat.name}
              </h3>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
                {(cat.themes || []).map((t) => {
                  const selected = value === t.id;
                  const baseSurface = cardSurfaceStyle(t.id);
                  const combinedShadow = selected
                    ? "0 0 12px #ffd70044, inset 0 0 0 1px rgba(255,215,0,0.15)"
                    : baseSurface.boxShadow;
                  return (
                    <div key={t.id} className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => handlePick(t.id)}
                        aria-pressed={selected}
                        className={`group relative flex h-[100px] w-full max-w-[140px] flex-col items-center justify-center rounded-lg px-2 text-center transition-[transform,border-color] duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd700] ${
                          selected
                            ? "scale-100"
                            : "scale-100 hover:scale-[1.03] hover:[border-color:rgba(255,255,255,0.22)]"
                        } `}
                        style={{
                          background: baseSurface.background,
                          boxShadow: combinedShadow,
                          border: selected ? "2px solid #ffd700" : "1px solid #2a2a2a",
                        }}
                      >
                        <span
                          className="pointer-events-none font-bold text-white"
                          style={{ fontSize: "14px", lineHeight: 1.25 }}
                        >
                          {t.name}
                        </span>
                        <span className="pointer-events-none mt-1 max-w-[120px] truncate text-[10px] font-medium uppercase tracking-wide text-slate-400/90">
                          {cat.name}
                        </span>
                        {selected ? (
                          <span
                            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#ffd700] text-slate-950 shadow-md"
                            aria-hidden
                          >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                              <path
                                d="M2.5 7.2L5.4 10l6.1-6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                        ) : null}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
          <button
            type="button"
            onClick={() => onChange("")}
            className={`text-sm font-medium underline-offset-4 transition hover:underline ${
              !value ? "text-[#ffd700]" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            No theme (default style)
          </button>
        </div>
      ) : null}
    </div>
  );
}
