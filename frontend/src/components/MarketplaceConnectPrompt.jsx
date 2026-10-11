import React, { useCallback, useState } from "react";
import { API_BASE_URL, AUTH_TOKEN_STORAGE_KEY, authHeaders } from "../config/api";
import { formatApiError } from "../utils/authFetch";
import {
  markStripeConnectRedirectPending,
  useResetStripeConnectBusy,
} from "../utils/stripeConnectUi";

/**
 * Bank setup for marketplace withdrawals only (Stripe Connect Express, individual).
 */
export default function MarketplaceConnectPrompt({
  profile,
  token,
  compact = false,
  returnPath = "/credits",
  connectFlowReset = 0,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useResetStripeConnectBusy(setBusy, connectFlowReset);

  const accountId = profile?.stripe_connect_account_id || profile?.stripe_account_id;
  const payoutsEnabled = profile?.stripe_payouts_enabled === true || profile?.payouts_enabled === true;
  const pendingVerification =
    accountId && !payoutsEnabled && (profile?.stripe_account_status === "pending" || profile?.stripe_onboarding_complete);

  const startOnboarding = useCallback(async () => {
    const authToken = (token || localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "").trim();
    if (!authToken) {
      setError("Please sign in again.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/connect/onboarding-link`, {
        method: "POST",
        headers: { ...authHeaders(authToken), "Content-Type": "application/json" },
        body: JSON.stringify({
          return_path: returnPath,
          refresh_path: returnPath,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(formatApiError(data?.detail, "Could not start bank setup."));
      }
      if (data.url) {
        markStripeConnectRedirectPending();
        window.location.assign(data.url);
        return;
      }
      throw new Error("No onboarding URL returned.");
    } catch (e) {
      setError(e.message || "Bank setup failed.");
    } finally {
      setBusy(false);
    }
  }, [token, returnPath]);

  if (payoutsEnabled) {
    return null;
  }

  return (
    <div className={`rounded-xl border border-white/10 bg-white/[0.03] p-4 ${compact ? "text-sm" : ""}`}>
      <p className="text-sm text-slate-400">
        {pendingVerification
          ? "Stripe is verifying your identity. You can finish any remaining steps, then withdraw to your bank."
          : "Link a bank account to send marketplace sale earnings to you. We use your account name and email to pre-fill Stripe’s form."}
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={startOnboarding}
        className="mt-4 min-h-[44px] w-full rounded-xl btn-primary px-4 text-sm font-semibold text-slate-950 disabled:opacity-50 sm:w-auto"
      >
        {busy ? "Redirecting…" : pendingVerification ? "Continue bank setup" : "Connect bank account"}
      </button>
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
