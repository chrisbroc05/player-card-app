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

export function WizardOptionCheckmark({ className = "" }) {
  return (
    <span
      className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-brand-gold text-slate-950 shadow-[0_0_12px_rgba(201,168,76,0.45)] ${className}`.trim()}
      aria-hidden
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    </span>
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
