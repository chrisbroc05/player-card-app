import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import BrandLogo from "../components/BrandLogo";
import PasswordInput from "../components/PasswordInput";
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

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = (searchParams.get("token") || "").trim();

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        if (!cancelled) {
          setTokenValid(false);
          setVerifying(false);
        }
        return;
      }
      try {
        const res = await fetch(
          `${API_BASE_URL}/auth/verify-reset-token?token=${encodeURIComponent(token)}`
        );
        if (!cancelled) {
          setTokenValid(res.ok);
          setVerifying(false);
        }
      } catch {
        if (!cancelled) {
          setTokenValid(false);
          setVerifying(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(formatApiError(data?.detail, "Could not reset password."));
      }
      setSuccess(true);
    } catch (err) {
      setError(err?.message || "Could not reset password.");
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

          {verifying ? (
            <div className="mt-8 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-[var(--color-gold-primary)]" />
            </div>
          ) : success ? (
            <div className="mt-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" aria-hidden />
              <h1 className="mt-4 text-2xl font-semibold text-white">Password reset successfully!</h1>
              <button
                type="button"
                onClick={() => navigate("/login", { replace: true })}
                className="btn-primary mt-8 min-h-[48px] w-full py-3 text-sm"
              >
                Log In Now
              </button>
            </div>
          ) : !tokenValid ? (
            <div className="mt-6 text-center">
              <h1 className="text-2xl font-semibold text-white">Link expired</h1>
              <p className="mt-3 text-sm text-slate-400">
                This reset link has expired or is invalid.
              </p>
              <Link to="/forgot-password" className="btn-primary mt-8 inline-flex min-h-[48px] w-full items-center justify-center py-3 text-sm">
                Request a new link
              </Link>
            </div>
          ) : (
            <>
              <h1 className="mt-4 text-center text-2xl font-semibold text-white">Create New Password</h1>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    New password
                  </label>
                  <div className="mt-1">
                    <PasswordInput
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Confirm password
                  </label>
                  <div className="mt-1">
                    <PasswordInput
                      autoComplete="new-password"
                      required
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                    />
                  </div>
                </div>

                <p className="text-xs text-slate-500">At least 8 characters</p>

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
                  {submitting ? "Resetting…" : "Reset Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
