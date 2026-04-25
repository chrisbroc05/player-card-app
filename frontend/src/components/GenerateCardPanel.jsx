import React from "react";

const TIER_OPTIONS = [
  { value: "base", label: "BASE" },
  { value: "rare", label: "RARE" },
  { value: "legendary", label: "1-OF-1" },
];

export default function GenerateCardPanel({
  playerId,
  tier,
  setTier,
  onGenerate,
  disabled,
  loading,
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-cardBg p-5 shadow-xl shadow-black/30 sm:p-6">
      <h2 className="text-lg font-semibold text-white">Generate Card</h2>
      <p className="mt-1 text-sm text-slate-400">Create a tiered AI baseball card from your player profile.</p>

      <div className="mt-5 grid gap-4">
        <div className="rounded-xl border border-white/10 bg-cardBg2 px-3 py-2 text-sm text-slate-300">
          Current Player ID: <span className="font-medium text-white">{playerId ?? "None yet"}</span>
        </div>

        <label className="grid gap-1.5 text-sm">
          <span className="text-slate-200">Card Style</span>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="rounded-xl border border-white/15 bg-cardBg2 px-3 py-2 text-slate-100 outline-none transition focus:border-neonPurple focus:ring-2 focus:ring-neonPurple/30"
          >
            {TIER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          disabled={disabled}
          onClick={onGenerate}
          className="inline-flex items-center justify-center rounded-xl bg-neonPurple px-4 py-2.5 text-sm font-medium text-white shadow-glowPurple transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Generating your card..." : "Generate Card"}
        </button>
      </div>
    </section>
  );
}
