import React, { useEffect, useState } from "react";
import { validatePlayerDetails, POSITION_OPTIONS } from "../utils/playerDetails";

function fieldErrorClass(hasError) {
  return hasError ? "border-rose-500/60" : "border-white/15";
}

export default function PlayerDetailsStep({
  values,
  onFieldBlur,
  onContinue,
  onBack,
  showErrors = false,
  errors = {},
}) {
  const [local, setLocal] = useState(values);

  useEffect(() => {
    setLocal(values);
  }, [values]);

  function updateLocal(field, value) {
    setLocal((prev) => ({ ...prev, [field]: value }));
  }

  function blurField(field) {
    onFieldBlur(field, local[field]);
  }

  function handleContinue() {
    onContinue(local);
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <input
            className={`min-h-[44px] w-full rounded-xl border bg-cardBg2 px-3 py-2.5 ${fieldErrorClass(showErrors && errors.playerName)}`}
            placeholder="First Name *"
            value={local.firstName}
            onChange={(e) => updateLocal("firstName", e.target.value)}
            onBlur={() => blurField("firstName")}
          />
        </div>
        <div>
          <input
            className={`min-h-[44px] w-full rounded-xl border bg-cardBg2 px-3 py-2.5 ${fieldErrorClass(showErrors && errors.playerName)}`}
            placeholder="Last Name *"
            value={local.lastName}
            onChange={(e) => updateLocal("lastName", e.target.value)}
            onBlur={() => blurField("lastName")}
          />
          {showErrors && errors.playerName ? (
            <p className="mt-1 text-xs text-rose-300">{errors.playerName}</p>
          ) : null}
        </div>
        <div className="sm:col-span-2">
          <input
            className={`min-h-[44px] w-full rounded-xl border bg-cardBg2 px-3 py-2.5 ${fieldErrorClass(showErrors && errors.playerName)}`}
            placeholder="Display Name (optional — used as player name if set)"
            value={local.displayName}
            onChange={(e) => updateLocal("displayName", e.target.value)}
            onBlur={() => blurField("displayName")}
          />
        </div>
        <div>
          <input
            className={`min-h-[44px] w-full rounded-xl border bg-cardBg2 px-3 py-2.5 ${fieldErrorClass(showErrors && errors.jerseyNumber)}`}
            placeholder="Jersey Number *"
            value={local.jerseyNumber}
            onChange={(e) => updateLocal("jerseyNumber", e.target.value)}
            onBlur={() => blurField("jerseyNumber")}
          />
          {showErrors && errors.jerseyNumber ? (
            <p className="mt-1 text-xs text-rose-300">{errors.jerseyNumber}</p>
          ) : null}
        </div>
        <div>
          <select
            className={`min-h-[44px] w-full rounded-xl border bg-cardBg2 px-3 py-2.5 text-slate-100 ${fieldErrorClass(showErrors && errors.position)}`}
            value={local.position}
            onChange={(e) => updateLocal("position", e.target.value)}
            onBlur={() => blurField("position")}
          >
            <option value="">Select Position</option>
            {POSITION_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {showErrors && errors.position ? (
            <p className="mt-1 text-xs text-rose-300">{errors.position}</p>
          ) : null}
        </div>
        <div>
          <input
            type="number"
            className={`min-h-[44px] w-full rounded-xl border bg-cardBg2 px-3 py-2.5 ${fieldErrorClass(showErrors && errors.gradYear)}`}
            placeholder="Grad Year *"
            value={local.gradYear}
            onChange={(e) => updateLocal("gradYear", e.target.value)}
            onBlur={() => blurField("gradYear")}
          />
          {showErrors && errors.gradYear ? (
            <p className="mt-1 text-xs text-rose-300">{errors.gradYear}</p>
          ) : null}
        </div>
        <div>
          <input
            className={`min-h-[44px] w-full rounded-xl border bg-cardBg2 px-3 py-2.5 ${fieldErrorClass(showErrors && errors.teamName)}`}
            placeholder="Team Name *"
            value={local.teamName}
            onChange={(e) => updateLocal("teamName", e.target.value)}
            onBlur={() => blurField("teamName")}
          />
          {showErrors && errors.teamName ? (
            <p className="mt-1 text-xs text-rose-300">{errors.teamName}</p>
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
          className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl bg-neonBlue px-4 py-2.5 text-sm font-medium text-slate-950 sm:w-auto"
        >
          Continue to Tier Selection
        </button>
      </div>
    </div>
  );
}