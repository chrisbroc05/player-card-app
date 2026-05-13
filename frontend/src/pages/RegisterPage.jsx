import React, { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config/api";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, user, initializing } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [betaLoaded, setBetaLoaded] = useState(false);
  const [betaMode, setBetaMode] = useState(false);
  const [betaBannerMessage, setBetaBannerMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/beta-status`);
        if (!res.ok) {
          if (!cancelled) setBetaLoaded(true);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setBetaMode(Boolean(data.beta_mode));
          setBetaBannerMessage(typeof data.message === "string" ? data.message : "");
          setBetaLoaded(true);
        }
      } catch {
        if (!cancelled) setBetaLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!initializing && user) {
    return <Navigate to="/my-collection" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInviteError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await register(email, displayName, password, betaMode ? inviteCode : undefined);
      navigate("/my-collection", { replace: true });
    } catch (err) {
      const msg = err?.message || "Registration failed";
      if (
        msg.includes("private beta") ||
        msg.toLowerCase().includes("invalid invite code")
      ) {
        setInviteError("Invalid invite code. Please check and try again.");
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-appBg text-slate-100">
      <AppHeader />
      <main className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-lg flex-col justify-center px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-white/10 bg-cardBg p-6 shadow-2xl shadow-black/40 sm:p-8">
          <p className="text-center text-[10px] font-medium uppercase tracking-[0.3em] text-slate-500">Future Legends</p>
          <h1 className="mt-2 text-center text-2xl font-semibold text-white">Create your account</h1>
          <p className="mt-1 text-center text-sm text-slate-400">Create cards in the studio and keep them in your collection.</p>

          {betaMode ? (
            <div
              className="mt-8 rounded-lg border text-[13px] leading-snug"
              style={{
                backgroundColor: "#1a1200",
                borderColor: "#f59e0b",
                color: "#f59e0b",
                padding: "12px 16px",
                marginBottom: "20px",
              }}
              role="status"
            >
              {betaBannerMessage ||
                "Future Legends is currently in private beta. You need an invite code to create an account."}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className={betaMode ? "space-y-4" : "mt-8 space-y-4"}>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Display Name</label>
              <input
                type="text"
                autoComplete="name"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 min-h-[46px] w-full rounded-xl border border-white/15 bg-cardBg2 px-3 py-2.5 text-slate-100"
              />
            </div>
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
            {betaMode ? (
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Invite Code</label>
                <input
                  type="text"
                  autoComplete="off"
                  required={betaMode}
                  value={inviteCode}
                  onChange={(e) => {
                    setInviteCode(e.target.value);
                    setInviteError("");
                  }}
                  placeholder="Enter your invite code"
                  className="mt-1 min-h-[46px] w-full rounded-xl border border-white/15 bg-cardBg2 px-3 py-2.5 text-slate-100 placeholder:text-slate-500"
                />
                {inviteError ? <p className="mt-1.5 text-sm text-amber-300">{inviteError}</p> : null}
              </div>
            ) : null}
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Password</label>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 min-h-[46px] w-full rounded-xl border border-white/15 bg-cardBg2 px-3 py-2.5 text-slate-100"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Confirm Password</label>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 min-h-[46px] w-full rounded-xl border border-white/15 bg-cardBg2 px-3 py-2.5 text-slate-100"
              />
            </div>

            {error ? (
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={submitting || !betaLoaded}
              className="min-h-[48px] w-full rounded-xl bg-neonTeal py-3 text-sm font-semibold text-slate-950 disabled:opacity-50"
            >
              {submitting ? "Creating account…" : !betaLoaded ? "Loading…" : "Sign Up"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-neonBlue hover:text-sky-200">
              Login
            </Link>
          </p>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
