import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import BrandLogo from "../components/BrandLogo";
import { API_BASE_URL } from "../config/api";

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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sentEmail, setSentEmail] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(formatApiError(data?.detail, "Something went wrong. Please try again."));
      }
      setSentEmail(email.trim());
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleTryAgain() {
    setSentEmail("");
    setError("");
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-appBg text-slate-100">
      <AppHeader />
      <main className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-lg flex-col justify-center px-4 py-12 sm:px-6">
        <div className="surface-card p-6 shadow-2xl sm:p-8">
          <div className="flex justify-center">
            <BrandLogo />
          </div>

          {sentEmail ? (
            <div className="mt-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" aria-hidden />
              <h1 className="mt-4 text-2xl font-semibold text-white">Check your email!</h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                We sent a reset link to <span className="text-slate-200">{sentEmail}</span>. It expires in 1 hour.
              </p>
              <p className="mt-3 text-sm text-slate-500">
                Didn&apos;t receive it? Check your spam folder or try again.
              </p>
              <button
                type="button"
                onClick={handleTryAgain}
                className="btn-secondary mt-8 min-h-[48px] w-full py-3 text-sm"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              <h1 className="mt-4 text-center text-2xl font-semibold text-white">Reset Password</h1>
              <p className="mt-1 text-center text-sm text-slate-400">
                Enter your email and we&apos;ll send you a reset link
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Email</label>
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 min-h-[46px] w-full rounded-xl border border-white/15 bg-cardBg2 px-3 py-2.5 text-slate-100"
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
                  className="btn-primary mt-6 min-h-[48px] w-full py-3 text-sm disabled:opacity-50"
                >
                  {submitting ? "Sending…" : "Send Reset Link"}
                </button>
              </form>
            </>
          )}

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
