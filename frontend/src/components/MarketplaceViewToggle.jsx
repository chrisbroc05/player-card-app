import React from "react";

export const MARKETPLACE_VIEW_STORAGE_KEY = "marketplace_view_preference";

export function readMarketplaceViewPreference() {
  try {
    const v = localStorage.getItem(MARKETPLACE_VIEW_STORAGE_KEY);
    return v === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}

export function writeMarketplaceViewPreference(mode) {
  try {
    localStorage.setItem(MARKETPLACE_VIEW_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export default function MarketplaceViewToggle({ value, onChange }) {
  const isGrid = value === "grid";

  return (
    <div
      className="inline-flex rounded-xl border border-white/15 bg-cardBg p-1"
      role="group"
      aria-label="Marketplace layout"
    >
      <ToggleButton
        active={isGrid}
        label="Grid View"
        onClick={() => onChange("grid")}
      >
        <GridIcon />
      </ToggleButton>
      <ToggleButton
        active={!isGrid}
        label="List View"
        onClick={() => onChange("list")}
      >
        <ListIcon />
      </ToggleButton>
    </div>
  );
}

function ToggleButton({ active, label, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={`inline-flex min-h-[40px] min-w-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition sm:min-w-[120px] ${
        active
          ? "bg-gold-subtle text-brand-gold shadow-sm"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
      }`}
    >
      {children}
      <span className="text-[10px] leading-tight sm:text-xs">{label}</span>
    </button>
  );
}

function GridIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 3a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 11a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path
        fillRule="evenodd"
        d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}
