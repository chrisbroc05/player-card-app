import React from "react";
import { POSITION_OPTIONS } from "../utils/playerDetails";
import { StudioWizardContinue } from "./StudioWizardControls";

function fieldClass(hasError) {
  return `studio-input${hasError ? " studio-input--error" : ""}`;
}

function FieldLabel({ htmlFor, required, children }) {
  return (
    <label htmlFor={htmlFor} className="studio-field-label">
      {children}
      {required ? <span className="studio-field-required"> *</span> : null}
    </label>
  );
}

export default function PlayerDetailsStep({
  values,
  onFieldChange,
  onContinue,
  showErrors = false,
  errors = {},
  continueLabel = "Choose Your Style →",
}) {
  function updateField(field, value) {
    onFieldChange?.(field, value);
  }

  function handleContinue() {
    onContinue(values);
  }

  return (
    <div className="studio-form-grid">
      <div className="studio-form-grid__fields">
        <div>
          <FieldLabel htmlFor="studio-first-name" required>
            First Name
          </FieldLabel>
          <input
            id="studio-first-name"
            className={fieldClass(showErrors && errors.firstName)}
            placeholder="First name"
            value={values.firstName}
            onChange={(e) => updateField("firstName", e.target.value)}
          />
          {showErrors && errors.firstName ? (
            <p className="studio-field-error">{errors.firstName}</p>
          ) : null}
        </div>
        <div>
          <FieldLabel htmlFor="studio-last-name" required>
            Last Name
          </FieldLabel>
          <input
            id="studio-last-name"
            className={fieldClass(showErrors && errors.lastName)}
            placeholder="Last name"
            value={values.lastName}
            onChange={(e) => updateField("lastName", e.target.value)}
          />
          {showErrors && errors.lastName ? (
            <p className="studio-field-error">{errors.lastName}</p>
          ) : null}
        </div>
        <div className="studio-form-grid__full">
          <FieldLabel htmlFor="studio-display-name">Display Name</FieldLabel>
          <input
            id="studio-display-name"
            className={fieldClass(false)}
            placeholder="Optional — used as player name if set"
            value={values.displayName}
            onChange={(e) => updateField("displayName", e.target.value)}
          />
        </div>
        <div>
          <FieldLabel htmlFor="studio-jersey">Jersey Number</FieldLabel>
          <input
            id="studio-jersey"
            className={fieldClass(showErrors && errors.jerseyNumber)}
            placeholder="Jersey #"
            value={values.jerseyNumber}
            onChange={(e) => updateField("jerseyNumber", e.target.value)}
          />
          {showErrors && errors.jerseyNumber ? (
            <p className="studio-field-error">{errors.jerseyNumber}</p>
          ) : null}
        </div>
        <div>
          <FieldLabel htmlFor="studio-position" required>
            Position
          </FieldLabel>
          <select
            id="studio-position"
            className={`${fieldClass(showErrors && errors.position)} studio-select`}
            value={values.position}
            onChange={(e) => updateField("position", e.target.value)}
          >
            <option value="">Select position</option>
            {POSITION_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {showErrors && errors.position ? (
            <p className="studio-field-error">{errors.position}</p>
          ) : null}
        </div>
        <div>
          <FieldLabel htmlFor="studio-grad-year" required>
            Grad Year
          </FieldLabel>
          <input
            id="studio-grad-year"
            type="number"
            className={fieldClass(showErrors && errors.gradYear)}
            placeholder="Grad year"
            value={values.gradYear}
            onChange={(e) => updateField("gradYear", e.target.value)}
          />
          {showErrors && errors.gradYear ? (
            <p className="studio-field-error">{errors.gradYear}</p>
          ) : null}
        </div>
        <div>
          <FieldLabel htmlFor="studio-team">Team Name</FieldLabel>
          <input
            id="studio-team"
            className={fieldClass(showErrors && errors.teamName)}
            placeholder="Team name"
            value={values.teamName}
            onChange={(e) => updateField("teamName", e.target.value)}
          />
          {showErrors && errors.teamName ? (
            <p className="studio-field-error">{errors.teamName}</p>
          ) : null}
        </div>
      </div>
      <StudioWizardContinue onClick={handleContinue}>{continueLabel}</StudioWizardContinue>
    </div>
  );
}
