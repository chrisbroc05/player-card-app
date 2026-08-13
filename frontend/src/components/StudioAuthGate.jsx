import React from "react";
import { Link } from "react-router-dom";

export default function StudioAuthGate({ onBackToTiers, backLabel = "← Back to tiers" }) {
  return (
    <div className="rounded-2xl border border-[var(--color-gold-bright/30] bg-gradient-to-b from-[var(--color-gold-bright/10] to-cardBg2 p-6 text-center shadow-lg sm:p-8">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Account required</p>
      <h3 className="mt-2 text-xl font-semibold text-white sm:text-2xl">Create your own card</h3>
      <p className="mx-auto mt-3 max-w-md text-sm text-slate-300">
        Sign up (or log in) to enter player details, upload a photo, and generate real collectibles saved to your
        collection.
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          to="/register"
          className="inline-flex min-h-[46px] w-full max-w-xs items-center justify-center rounded-xl btn-primary px-5 py-2.5 text-sm font-semibold text-slate-950 sm:w-auto"
        >
          Sign up free
        </Link>
        <Link
          to="/login"
          className="inline-flex min-h-[46px] w-full max-w-xs items-center justify-center rounded-xl border border-white/20 bg-cardBg px-5 py-2.5 text-sm font-medium text-white sm:w-auto"
        >
          Log in
        </Link>
      </div>
      <button
        type="button"
        onClick={onBackToTiers}
        className="mt-6 text-sm text-slate-400 underline decoration-white/20 underline-offset-4 transition hover:text-white"
      >
        {backLabel}
      </button>
    </div>
  );
}
