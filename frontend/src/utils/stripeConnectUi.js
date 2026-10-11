import { useEffect } from "react";

const PENDING_REDIRECT_KEY = "pl_stripe_connect_redirect_pending";

/** Mark that the user is leaving the app for Stripe Connect onboarding. */
export function markStripeConnectRedirectPending() {
  try {
    sessionStorage.setItem(PENDING_REDIRECT_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

function clearStripeConnectRedirectPending() {
  try {
    sessionStorage.removeItem(PENDING_REDIRECT_KEY);
  } catch {
    /* ignore */
  }
}

function isStripeConnectReturnUrl() {
  const connect = new URLSearchParams(window.location.search).get("connect");
  return connect === "complete" || connect === "refresh";
}

function hadPendingStripeConnectRedirect() {
  try {
    return Boolean(sessionStorage.getItem(PENDING_REDIRECT_KEY));
  } catch {
    return false;
  }
}

/**
 * Reset connect/onboarding button loading after Stripe return, bfcache restore, or cancelled flow.
 */
export function useResetStripeConnectBusy(setBusy, resetSignal = 0) {
  useEffect(() => {
    const reset = () => {
      setBusy(false);
      clearStripeConnectRedirectPending();
    };

    if (isStripeConnectReturnUrl() || hadPendingStripeConnectRedirect()) {
      reset();
    }

    const onPageShow = (event) => {
      if (event.persisted || isStripeConnectReturnUrl() || hadPendingStripeConnectRedirect()) {
        reset();
      }
    };

    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [setBusy, resetSignal]);
}
