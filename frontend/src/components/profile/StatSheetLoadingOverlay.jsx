import React from "react";

export default function StatSheetLoadingOverlay({ loading, children, className = "" }) {
  return (
    <div
      className={`stat-sheet-loading-shell${loading ? " stat-sheet-loading-shell--loading" : ""}${className ? ` ${className}` : ""}`}
      aria-busy={loading}
    >
      {children}
      {loading ? (
        <div className="stat-sheet-loading-shell__overlay" aria-hidden>
          <div className="stat-sheet-loading-shell__spinner" />
        </div>
      ) : null}
    </div>
  );
}
