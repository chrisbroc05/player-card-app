import React from "react";

export default function SettingsToggle({ checked, onChange, disabled = false, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`settings-toggle${checked ? " settings-toggle--on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="settings-toggle__thumb" aria-hidden />
    </button>
  );
}
