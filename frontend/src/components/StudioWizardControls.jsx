import React from "react";

export function StudioWizardBack({ onClick, className = "" }) {
  return (
    <button type="button" className={`studio-wizard-back ${className}`.trim()} onClick={onClick}>
      ← Back
    </button>
  );
}

export function StudioWizardContinue({ children, onClick, disabled = false, className = "" }) {
  return (
    <button
      type="button"
      className={`studio-wizard-continue ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function StudioPhaseHeader({ title, subtitle }) {
  return (
    <header className="studio-phase-header">
      <h2 className="studio-phase-header__title">{title}</h2>
      {subtitle ? <p className="studio-phase-header__subtitle">{subtitle}</p> : null}
    </header>
  );
}
