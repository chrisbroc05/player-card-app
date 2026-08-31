import React, { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import BrandLogo from "../components/BrandLogo";
import { API_BASE_URL, ADMIN_TOKEN_STORAGE_KEY } from "../config/api";
import { useAuth } from "../context/AuthContext";

function formatApiError(detail, fallback) {
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((item) => (typeof item === "string" ? item : item?.msg))
      .filter(Boolean);
    return msgs.length ? msgs.join(" | ") : fallback;
  }
  if (typeof detail === "object" && typeof detail.message === "string") return detail.message;
  return fallback;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, initializing } = useAuth();
  const redirectTo = location.state?.from || "/my-collection";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminMode, setAdminMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!initializing && user && !adminMode) {
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setAdminError("");
    setSubmitting(true);
    try {
      if (adminMode) {
        const res = await fetch(`${API_BASE_URL}/admin/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        let data = {};
        try {
          data = await res.json();
        } catch {
          data = {};
        }
        if (!res.ok || !data.access_token) {
          const fallback =
            res.status === 503
              ? "Admin login is not configured. Add ADMIN_EMAIL and ADMIN_PASSWORD on the backend (e.g. Render), then restart."
              : "Invalid admin credentials";
          setAdminError(formatApiError(data?.detail, fallback));
          return;
        }
        localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, data.access_token);
        navigate("/admin", { replace: true });
      } else {
        await login(email, password);
        navigate(redirectTo, { replace: true });
      }
    } catch {
      if (adminMode) setAdminError("Could not reach the server. Check your connection and API URL.");
      else setError("Invalid email or password");
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
          <h1 className="mt-4 text-center text-2xl font-semibold text-white">
            {adminMode ? "Admin Login" : "Welcome back"}
          </h1>
          <p className="mt-1 text-center text-sm text-slate-400">
            {adminMode ? "Sign in with admin credentials." : "Sign in to access your collection."}
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
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Password</label>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 min-h-[46px] w-full rounded-xl border border-white/15 bg-cardBg2 px-3 py-2.5 text-slate-100"
              />
            </div>
            {!adminMode ? (
              <Link
                to="/forgot-password"
                className="text-xs text-slate-500 underline decoration-white/20 underline-offset-2 hover:text-slate-300"
              >
                Forgot password?
              </Link>
            ) : null}

            {!adminMode && error ? (
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                {error}
              </p>
            ) : null}
            {adminMode && adminError ? (
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                {adminError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary mt-6 min-h-[48px] w-full py-3 text-sm disabled:opacity-50"
            >
              {submitting ? "Signing in…" : adminMode ? "Admin sign in" : "Login"}
            </button>
          </form>

          {!adminMode ? (
            <p className="mt-6 text-center text-sm text-slate-400">
              Don&apos;t have an account?{" "}
              <Link to="/register" className="font-medium text-[var(--color-text-gold)] hover:text-[var(--color-text-gold-bright)]">
                Sign up
              </Link>
            </p>
          ) : (
            <p className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setAdminMode(false);
                  setAdminError("");
                  setError("");
                }}
                className="text-sm text-brand-gold underline decoration-white/20 underline-offset-2 hover:text-brand-gold"
              >
                Back to user login
              </button>
            </p>
          )}

          {!adminMode ? (
            <p className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setAdminMode(true);
                  setError("");
                  setAdminError("");
                }}
                className="text-xs text-slate-600 transition hover:text-slate-400"
              >
                Admin Access
              </button>
            </p>
          ) : null}
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
