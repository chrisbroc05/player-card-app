import React, { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import BrandLogo from "../components/BrandLogo";
import { EnableBiometricPrompt } from "../components/EnableBiometricPrompt";
import { API_BASE_URL, ADMIN_TOKEN_STORAGE_KEY } from "../config/api";
import { useAuth } from "../context/AuthContext";
import {
  BIOMETRIC_CREDENTIAL_ID_KEY,
  BIOMETRIC_DISMISSED_KEY,
  BIOMETRIC_ENABLED_KEY,
  authenticationCredentialToJSON,
  isBiometricAvailable,
  parseAuthenticationOptions,
  parseOptionsResponse,
} from "../utils/webauthn";

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
  const { login, user, initializing, applyAuthSession } = useAuth();
  const redirectTo = location.state?.from || "/my-collection";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminMode, setAdminMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);

  useEffect(() => {
    if (adminMode) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const enabled = localStorage.getItem(BIOMETRIC_ENABLED_KEY);
        if (!enabled) return;
        const available = await isBiometricAvailable();
        if (!cancelled) setShowBiometric(available);
      } catch {
        if (!cancelled) setShowBiometric(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminMode]);

  function finishLoginNavigation() {
    navigate(redirectTo, { replace: true });
  }

  function maybeShowBiometricPrompt() {
    const biometricEnabled = localStorage.getItem(BIOMETRIC_ENABLED_KEY);
    const biometricDismissed = localStorage.getItem(BIOMETRIC_DISMISSED_KEY);
    if (!biometricEnabled && !biometricDismissed) {
      setShowBiometricPrompt(true);
      return;
    }
    finishLoginNavigation();
  }

  function dismissBiometricPrompt() {
    localStorage.setItem(BIOMETRIC_DISMISSED_KEY, "true");
    setShowBiometricPrompt(false);
    finishLoginNavigation();
  }

  async function loginWithBiometric() {
    setBiometricBusy(true);
    setError("");
    try {
      const credentialId = localStorage.getItem(BIOMETRIC_CREDENTIAL_ID_KEY);
      const optionsRes = await fetch(`${API_BASE_URL}/auth/webauthn/login-options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential_id: credentialId || null }),
      });
      if (!optionsRes.ok) {
        throw new Error("Face ID login unavailable.");
      }
      const options = parseAuthenticationOptions(
        await parseOptionsResponse(optionsRes),
        credentialId
      );

      const credential = await navigator.credentials.get({
        publicKey: options,
      });

      const verifyRes = await fetch(`${API_BASE_URL}/auth/webauthn/login-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authenticationCredentialToJSON(credential)),
      });
      const data = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok || !data.access_token) {
        throw new Error(data?.detail || "Face ID login failed.");
      }

      applyAuthSession(data.access_token, data.user);
      finishLoginNavigation();
    } catch {
      // Fall back to password login silently
    } finally {
      setBiometricBusy(false);
    }
  }

  if (!initializing && user && !adminMode && !showBiometricPrompt) {
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
        maybeShowBiometricPrompt();
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
            {!adminMode && showBiometric ? (
              <button
                type="button"
                onClick={loginWithBiometric}
                disabled={biometricBusy || submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[rgba(201,168,76,0.4)] px-4 py-3.5 text-[15px] font-bold text-[#C9A84C]"
                style={{ fontFamily: "Barlow Condensed, sans-serif" }}
              >
                <span aria-hidden style={{ fontSize: "18px" }}>
                  👤
                </span>
                {biometricBusy ? "Signing in…" : "Sign in with Face ID"}
              </button>
            ) : null}

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

      {showBiometricPrompt ? (
        <EnableBiometricPrompt
          onDismiss={dismissBiometricPrompt}
          onEnabled={() => {
            setShowBiometricPrompt(false);
            setShowBiometric(true);
            finishLoginNavigation();
          }}
        />
      ) : null}
    </div>
  );
}
