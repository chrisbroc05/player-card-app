import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../config/api";
import { ANIMATION_MOTION_CATEGORIES, groupMotionsByCategory } from "../constants/animationMotions";

export default function MotionSelectionGrid({ value, onChange, compact = false, error = "" }) {
  const [motions, setMotions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/cards/animation-motions`);
        const data = await res.json().catch(() => []);
        if (!cancelled) setMotions(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setMotions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = groupMotionsByCategory(motions);

  if (loading) {
    return <p className="text-sm text-slate-400">Loading motion options…</p>;
  }

  return (
    <div className="space-y-5">
      {ANIMATION_MOTION_CATEGORIES.map((cat) => {
        const items = groups[cat] || [];
        if (!items.length) return null;
        return (
          <div key={cat}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{cat}</p>
            <div
              className={
                compact ? "max-h-56 space-y-2 overflow-y-auto pr-1" : "grid grid-cols-2 gap-3 md:grid-cols-3"
              }
            >
              {items.map((m) => {
                const selected = value === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onChange(m.id)}
                    className={`relative w-full rounded-xl border p-3 text-left transition ${
                      selected
                        ? "border-violet-400/70 bg-violet-500/15 shadow-[0_0_20px_rgba(167,139,250,0.25)]"
                        : "border-white/10 bg-cardBg2 hover:border-white/25"
                    }`}
                  >
                    {selected ? (
                      <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-[10px] text-white">
                        ✓
                      </span>
                    ) : null}
                    <p className={`pr-6 text-sm font-medium ${selected ? "text-violet-100" : "text-white"}`}>
                      {m.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
