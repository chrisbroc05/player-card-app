import React from "react";

export default function PlayerFormCard({
  firstName,
  lastName,
  displayName,
  jerseyNumber,
  position,
  gradYear,
  teamName,
  battingHand,
  imageFile,
  setFirstName,
  setLastName,
  setDisplayName,
  setJerseyNumber,
  setPosition,
  setGradYear,
  setTeamName,
  setBattingHand,
  setImageFile,
  onSubmit,
  disabled,
  loading,
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-cardBg p-5 shadow-xl shadow-black/30 sm:p-6">
      <h2 className="text-lg font-semibold text-white">Create Player</h2>
      <p className="mt-1 text-sm text-slate-400">Add a player profile and upload their source image.</p>

      <form className="mt-5 grid gap-5" onSubmit={onSubmit}>
        <div className="grid gap-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Name</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm">
              <span className="text-slate-200">First Name</span>
              <input
                className="rounded-xl border border-white/15 bg-cardBg2 px-3 py-2 text-slate-100 outline-none transition focus:border-neonBlue focus:ring-2 focus:ring-neonBlue/30"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Chris"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="text-slate-200">Last Name</span>
              <input
                className="rounded-xl border border-white/15 bg-cardBg2 px-3 py-2 text-slate-100 outline-none transition focus:border-neonBlue focus:ring-2 focus:ring-neonBlue/30"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Broccolino"
              />
            </label>
          </div>
          <label className="grid gap-1.5 text-sm">
            <span className="text-slate-200">Display Name (optional fallback)</span>
            <input
              className="rounded-xl border border-white/15 bg-cardBg2 px-3 py-2 text-slate-100 outline-none transition focus:border-neonBlue focus:ring-2 focus:ring-neonBlue/30"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. C. Broc"
            />
          </label>
        </div>

        <div className="grid gap-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Player Info</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm">
              <span className="text-slate-200">Jersey Number</span>
              <input
                className="rounded-xl border border-white/15 bg-cardBg2 px-3 py-2 text-slate-100 outline-none transition focus:border-neonBlue focus:ring-2 focus:ring-neonBlue/30"
                value={jerseyNumber}
                onChange={(e) => setJerseyNumber(e.target.value)}
                placeholder="e.g. 27"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="text-slate-200">Position</span>
              <input
                className="rounded-xl border border-white/15 bg-cardBg2 px-3 py-2 text-slate-100 outline-none transition focus:border-neonBlue focus:ring-2 focus:ring-neonBlue/30"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="e.g. Pitcher"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm">
              <span className="text-slate-200">Grad Year</span>
              <input
                type="number"
                className="rounded-xl border border-white/15 bg-cardBg2 px-3 py-2 text-slate-100 outline-none transition focus:border-neonBlue focus:ring-2 focus:ring-neonBlue/30"
                value={gradYear}
                onChange={(e) => setGradYear(e.target.value)}
                placeholder="e.g. 2027"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="text-slate-200">Batting Hand (optional)</span>
              <select
                className="rounded-xl border border-white/15 bg-cardBg2 px-3 py-2 text-slate-100 outline-none transition focus:border-neonBlue focus:ring-2 focus:ring-neonBlue/30"
                value={battingHand}
                onChange={(e) => setBattingHand(e.target.value)}
              >
                <option value="">Select hand</option>
                <option value="Right">Right</option>
                <option value="Left">Left</option>
                <option value="Switch">Switch</option>
              </select>
            </label>
          </div>
        </div>

        <div className="grid gap-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Team</p>
          <label className="grid gap-1.5 text-sm">
            <span className="text-slate-200">Team Name</span>
            <input
              className="rounded-xl border border-white/15 bg-cardBg2 px-3 py-2 text-slate-100 outline-none transition focus:border-neonBlue focus:ring-2 focus:ring-neonBlue/30"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. Chicago White Sox"
            />
          </label>
        </div>

        <label className="grid gap-1.5 text-sm">
          <span className="text-slate-200">Image Upload</span>
          <input
            type="file"
            accept="image/*"
            className="rounded-xl border border-white/15 bg-cardBg2 px-3 py-2 text-slate-200 file:mr-3 file:rounded-lg file:border-0 file:bg-neonBlue/20 file:px-3 file:py-1.5 file:text-neonBlue"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
          />
          {imageFile ? <span className="text-xs text-slate-400">{imageFile.name}</span> : null}
        </label>

        <button
          type="submit"
          disabled={disabled}
          className="mt-1 inline-flex items-center justify-center rounded-xl bg-neonBlue px-4 py-2.5 text-sm font-medium text-slate-950 shadow-glowBlue transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Creating Player..." : "Create Player"}
        </button>
      </form>
    </section>
  );
}
