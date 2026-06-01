import React from "react";
import { toApiUrl } from "../config/api";

export default function PendingCardResumePrompt({
  session,
  loading,
  showDiscardConfirm,
  onResume,
  onDiscardRequest,
  onDiscardConfirm,
  onDiscardCancel,
  onDismiss,
}) {
  if (!session) return null;

  const latestPreview = session.previews?.[session.previews.length - 1];
  const playerName =
    latestPreview?.player_name ||
    session.draft?.player_display_name ||
    [session.draft?.player_first_name, session.draft?.player_last_name].filter(Boolean).join(" ") ||
    "your player";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-neonTeal/35 bg-cardBg shadow-[0_0_60px_rgba(45,212,191,0.15)]"
        role="dialog"
        aria-labelledby="pending-card-title"
        aria-modal="true"
      >
        <div className="border-b border-white/10 bg-gradient-to-r from-neonBlue/10 via-neonTeal/10 to-neonPurple/10 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-neonTeal">Unfinished card</p>
          <h2 id="pending-card-title" className="mt-1 text-xl font-semibold text-white">
            You have an unfinished card!
          </h2>
          <p className="mt-2 text-sm text-slate-300">Pick up where you left off?</p>
        </div>

        <div className="space-y-4 px-5 py-5">
          {latestPreview?.image_url ? (
            <div className="mx-auto max-w-[180px] overflow-hidden rounded-xl border border-white/15 bg-black/30">
              <img
                src={toApiUrl(latestPreview.image_url)}
                alt={`Preview for ${playerName}`}
                className="block aspect-[2/3] w-full object-contain"
              />
            </div>
          ) : null}

          <div className="rounded-xl border border-white/10 bg-cardBg2 px-4 py-3 text-sm text-slate-200">
            <p>
              <span className="text-slate-400">Player:</span> {playerName}
            </p>
            {session.preview_count > 1 ? (
              <p className="mt-1 text-xs text-slate-400">
                {session.preview_count} previews saved — credits already used will not be charged again.
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-400">
                Your preview is saved — credits already used will not be charged again.
              </p>
            )}
          </div>

          {showDiscardConfirm ? (
            <div className="rounded-xl border border-amber-400/35 bg-amber-500/10 px-4 py-3">
              <p className="text-sm font-medium text-amber-100">Are you sure?</p>
              <p className="mt-1 text-xs text-amber-100/90">
                This will discard your generated preview. Credits already used will not be refunded.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onDiscardConfirm}
                  disabled={loading}
                  className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-rose-400/40 bg-rose-500/15 px-4 py-2 text-sm font-medium text-rose-100 disabled:opacity-50"
                >
                  {loading ? "Discarding..." : "Yes, discard"}
                </button>
                <button
                  type="button"
                  onClick={onDiscardCancel}
                  disabled={loading}
                  className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-white/20 bg-cardBg px-4 py-2 text-sm font-medium text-slate-200 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onResume}
                disabled={loading}
                className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-neonTeal px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Restoring..." : "Resume"}
              </button>
              <button
                type="button"
                onClick={onDiscardRequest}
                disabled={loading}
                className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl border border-white/20 bg-cardBg2 px-4 py-2.5 text-sm font-medium text-slate-200 disabled:opacity-50"
              >
                Discard
              </button>
            </div>
          )}

          {!showDiscardConfirm ? (
            <button
              type="button"
              onClick={onDismiss}
              disabled={loading}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-300 disabled:opacity-50"
            >
              Remind me later
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
