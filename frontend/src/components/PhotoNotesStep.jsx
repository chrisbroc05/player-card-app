import React, { useEffect, useState } from "react";

export default function PhotoNotesStep({ value, onChange, onContinue, onBack }) {
  const [localNotes, setLocalNotes] = useState(value || "");

  useEffect(() => {
    setLocalNotes(value || "");
  }, [value]);

  function handleBlur() {
    onChange(localNotes.trim().slice(0, 200));
  }

  function handleContinue() {
    const trimmed = localNotes.trim().slice(0, 200);
    onChange(trimmed);
    onContinue();
  }

  return (
    <div className="grid gap-4">
      <div>
        <h3 className="text-lg font-semibold text-white">Anything we should know about your photo?</h3>
        <p className="mt-1 text-sm text-slate-400">
          Optional — if there are multiple people in your photo, tell us who to focus on. Any other
          details that might help.
        </p>
      </div>
      <div className="rounded-xl border border-white/10 bg-cardBg2 p-4">
        <textarea
          id="photo-notes"
          rows={4}
          maxLength={200}
          value={localNotes}
          onChange={(e) => setLocalNotes(e.target.value.slice(0, 200))}
          onBlur={handleBlur}
          placeholder={`e.g. "I'm the player on the left in the red jersey"`}
          className="w-full resize-none rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-[var(--color-gold-bright/50] focus:outline-none focus:ring-1 focus:ring-[var(--color-gold-bright/40]"
        />
        <p className="mt-1 text-right text-xs text-slate-500">{localNotes.length} / 200</p>
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
          Continue to Review →
        </button>
      </div>
    </div>
  );
}
