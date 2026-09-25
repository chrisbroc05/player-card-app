import React, { useCallback, useState } from "react";
import { API_BASE_URL, AUTH_TOKEN_STORAGE_KEY, authHeaders } from "../config/api";
import { formatApiError } from "../utils/authFetch";

/**
 * Stripe Connect Express status and onboarding CTA for marketplace sellers / fund loaders.
 */
export default function MarketplaceConnectPrompt({
  profile,
  token,
  onStatusUpdate,
  compact = false,
  requireSellReady = false,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const accountId = profile?.stripe_connect_account_id || profile?.stripe_account_id;
  const chargesEnabled = profile?.stripe_charges_enabled === true || profile?.charges_enabled === true;
  const payoutsEnabled = profile?.stripe_payouts_enabled === true || profile?.payouts_enabled === true;
  const onboardingComplete = profile?.stripe_onboarding_complete === true;

  const sellReady = chargesEnabled && payoutsEnabled;
  const pendingVerification = accountId && !sellReady && (onboardingComplete || profile?.stripe_account_status === "pending");
  const notConnected = !accountId;

  let statusLabel = "Not connected";
  let statusClass = "border-white/15 bg-white/5 text-slate-300";
  if (sellReady) {
    statusLabel = "Connected — ready to sell & withdraw";
    statusClass = "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
  } else if (pendingVerification) {
    statusLabel = "Connected — verification pending";
    statusClass = "border-amber-500/40 bg-amber-500/10 text-amber-100";
  } else if (accountId) {
    statusLabel = "Connected — finish onboarding";
    statusClass = "border-amber-500/40 bg-amber-500/10 text-amber-100";
  }

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
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(formatApiError(data?.detail, "Could not start Stripe Connect onboarding."));
      }
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      throw new Error("No onboarding URL returned.");
    } catch (e) {
      setError(e.message || "Onboarding failed.");
    } finally {
      setBusy(false);
    }
  }, [token]);

  if (requireSellReady && sellReady) {
    return null;
  }

  return (
    <div className={`rounded-xl border p-4 ${compact ? "text-sm" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Stripe Connect</p>
          <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClass}`}>
            {statusLabel}
          </span>
          {!compact ? (
            <p className="mt-3 text-sm text-slate-400">
              Marketplace funds and seller payouts use Stripe Express. Card creation credits stay on your main account
              balance and are separate.
            </p>
          ) : null}
          {requireSellReady && !sellReady ? (
            <p className="mt-2 text-sm text-amber-100">
              Complete Stripe onboarding before listing cards for sale.
            </p>
          ) : null}
        </div>
        {!sellReady ? (
          <button
            type="button"
            disabled={busy}
            onClick={startOnboarding}
            className="min-h-[40px] shrink-0 rounded-xl btn-primary px-4 text-sm font-semibold text-slate-950 disabled:opacity-50"
          >
            {busy ? "Redirecting…" : accountId ? "Continue onboarding" : "Connect Stripe account"}
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
