import React, { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import BrandLogo from "../components/BrandLogo";
import { API_BASE_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { clearBiometricRequired } from "../utils/activityTracker";

function formatApiError(detail, fallback) {
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const msgs = detail.map((item) => (typeof item === "string" ? item : item?.msg)).filter(Boolean);
    return msgs.length ? msgs.join(" | ") : fallback;
  }
  if (typeof detail === "object" && typeof detail.message === "string") return detail.message;
  return fallback;
}

export default function GoogleInvitePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { applyAuthSession, user, initializing } = useAuth();
  const pending = (searchParams.get("pending") || "").trim();
  const email = (searchParams.get("email") || "").trim();
  const name = (searchParams.get("name") || "").trim();
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!initializing && user) {
    return <Navigate to="/my-collection" replace />;
  }

  if (!pending) {
    return <Navigate to="/login?error=google_failed" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/google/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pending,
          invite_code: inviteCode.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(formatApiError(data?.detail, "Could not complete signup."));
      }
      if (!data.access_token) {
        throw new Error("Sign up did not return a session.");
      }
      applyAuthSession(data.access_token, data.user);
      clearBiometricRequired();
      navigate(data.is_new ? "/studio" : "/my-collection", { replace: true });
    } catch (err) {
      setError(err?.message || "Could not complete signup.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-appBg text-slate-100">
      <AppHeader />
      <main className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-lg flex-col justify-center px-4 py-12 sm:px-6">
        <div className="surface-card p-6 shadow-2xl sm:p-8">
          <div className="flex justify-center">
            <BrandLogo />
          </div>
          <h1 className="mt-4 text-center text-2xl font-semibold text-white">You&apos;re almost in!</h1>
          <p className="mt-2 text-center text-sm text-slate-400">
            Enter your beta invite code to finish creating your account with Google.
          </p>

          {(name || email) && (
            <div className="mt-6 rounded-xl border border-white/10 bg-cardBg2 px-4 py-3 text-center">
              {name ? <p className="text-sm font-medium text-white">{name}</p> : null}
              {email ? <p className="text-xs text-slate-400">{email}</p> : null}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Beta Invite Code
              </label>
              <input
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="mt-1 min-h-[46px] w-full rounded-xl border border-white/15 bg-cardBg2 px-3 py-2.5 text-slate-100"
                placeholder="Enter invite code"
                autoComplete="off"
              />
            </div>

            {error ? (
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary mt-2 min-h-[48px] w-full py-3 text-sm disabled:opacity-50"
            >
              {submitting ? "Joining…" : "Join Prospect Legends"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            <Link
              to="/login"
              className="font-medium text-[var(--color-text-gold)] hover:text-[var(--color-text-gold-bright)]"
            >
              Back to Login
            </Link>
          </p>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
