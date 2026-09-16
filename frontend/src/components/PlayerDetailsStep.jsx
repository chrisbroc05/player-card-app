import React from "react";
import { POSITION_OPTIONS } from "../utils/playerDetails";

const FIELD_ERROR_STYLE = {
  color: "#EF5350",
  fontFamily: '"Barlow Condensed", sans-serif',
  fontSize: "12px",
};

function fieldBorderClass(hasError) {
  return hasError ? "border-[rgba(239,83,80,0.6)]" : "border-white/15";
}

export default function PlayerDetailsStep({
  values,
  onFieldChange,
  onContinue,
  onBack,
  showErrors = false,
  errors = {},
}) {
  function updateField(field, value) {
    onFieldChange?.(field, value);
  }

  function handleContinue() {
    onContinue(values);
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <input
            className={`min-h-[44px] w-full rounded-xl border bg-cardBg2 px-3 py-2.5 ${fieldBorderClass(showErrors && errors.firstName)}`}
            placeholder="First Name *"
            value={values.firstName}
            onChange={(e) => updateField("firstName", e.target.value)}
          />
          {showErrors && errors.firstName ? (
            <p className="mt-1" style={FIELD_ERROR_STYLE}>
              {errors.firstName}
            </p>
          ) : null}
        </div>
        <div>
          <input
            className={`min-h-[44px] w-full rounded-xl border bg-cardBg2 px-3 py-2.5 ${fieldBorderClass(showErrors && errors.lastName)}`}
            placeholder="Last Name *"
            value={values.lastName}
            onChange={(e) => updateField("lastName", e.target.value)}
          />
          {showErrors && errors.lastName ? (
            <p className="mt-1" style={FIELD_ERROR_STYLE}>
              {errors.lastName}
            </p>
          ) : null}
        </div>
        <div className="sm:col-span-2">
          <input
            className={`min-h-[44px] w-full rounded-xl border bg-cardBg2 px-3 py-2.5 ${fieldBorderClass(false)}`}
            placeholder="Display Name (optional — used as player name if set)"
            value={values.displayName}
            onChange={(e) => updateField("displayName", e.target.value)}
          />
        </div>
        <div>
          <input
            className={`min-h-[44px] w-full rounded-xl border bg-cardBg2 px-3 py-2.5 ${fieldBorderClass(showErrors && errors.jerseyNumber)}`}
            placeholder="Jersey Number"
            value={values.jerseyNumber}
            onChange={(e) => updateField("jerseyNumber", e.target.value)}
          />
          {showErrors && errors.jerseyNumber ? (
            <p className="mt-1" style={FIELD_ERROR_STYLE}>
              {errors.jerseyNumber}
            </p>
          ) : null}
        </div>
        <div>
          <select
            className={`min-h-[44px] w-full rounded-xl border bg-cardBg2 px-3 py-2.5 text-slate-100 ${fieldBorderClass(showErrors && errors.position)}`}
            value={values.position}
            onChange={(e) => updateField("position", e.target.value)}
          >
            <option value="">Select Position *</option>
            {POSITION_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {showErrors && errors.position ? (
            <p className="mt-1" style={FIELD_ERROR_STYLE}>
              {errors.position}
            </p>
          ) : null}
        </div>
        <div>
          <input
            type="number"
            className={`min-h-[44px] w-full rounded-xl border bg-cardBg2 px-3 py-2.5 ${fieldBorderClass(showErrors && errors.gradYear)}`}
            placeholder="Grad Year *"
            value={values.gradYear}
            onChange={(e) => updateField("gradYear", e.target.value)}
          />
          {showErrors && errors.gradYear ? (
            <p className="mt-1" style={FIELD_ERROR_STYLE}>
              {errors.gradYear}
            </p>
          ) : null}
        </div>
        <div>
          <input
            className={`min-h-[44px] w-full rounded-xl border bg-cardBg2 px-3 py-2.5 ${fieldBorderClass(showErrors && errors.teamName)}`}
            placeholder="Team Name"
            value={values.teamName}
            onChange={(e) => updateField("teamName", e.target.value)}
          />
          {showErrors && errors.teamName ? (
            <p className="mt-1" style={FIELD_ERROR_STYLE}>
              {errors.teamName}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/20 bg-cardBg2 px-4 py-2.5 text-sm font-medium text-slate-100"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl btn-primary px-4 py-2.5 text-sm font-medium text-slate-950 sm:w-auto"
        >
          Continue to Tier Selection
        </button>
      </div>
    </div>
  );
}
