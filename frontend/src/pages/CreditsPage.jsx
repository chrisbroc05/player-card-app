import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import { useAuth } from "../context/AuthContext";
import { authFetch, formatApiError } from "../utils/authFetch";
import { formatMoney } from "../utils/marketplace";

const PRESET_AMOUNTS = [10, 20, 50, 100];

function txTypeLabel(type) {
  const t = (type || "").toLowerCase();
  const labels = {
    top_up: "Top-up",
    gift: "Gift",
    card_purchase: "Card purchase",
    card_sale: "Card sale",
    royalty: "Royalty",
    generation: "Generation",
    animation: "Animation",
    priority: "Priority listing",
    withdrawal: "Withdrawal",
    refund: "Refund",
  };
  return labels[t] || type || "—";
}

function formatLedgerDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function CreditsPage() {
  const { user, token, initializing, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState("");
  const [giftQuery, setGiftQuery] = useState("");
  const [giftResults, setGiftResults] = useState([]);
  const [giftRecipient, setGiftRecipient] = useState(null);
  const [giftSearching, setGiftSearching] = useState(false);
  const [ledger, setLedger] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [paymentsDisabled, setPaymentsDisabled] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [error, setError] = useState("");
  const [banner, setBanner] = useState("");

  const balance = user?.credit_balance ?? 0;

  const resolvedAmount = useMemo(() => {
    if (selectedAmount != null) return selectedAmount;
    const n = Number(customAmount);
    if (Number.isFinite(n) && n > 0) return n;
    return null;
  }, [selectedAmount, customAmount]);

  const loadLedger = useCallback(async () => {
    if (!token) return;
    setLedgerLoading(true);
    try {
      const { res, unauthorized } = await authFetch(token, "/credits/ledger?limit=20");
      if (unauthorized) return;
      if (res.status === 503) {
        setPaymentsDisabled(true);
        setLedger([]);
        return;
      }
      setPaymentsDisabled(false);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Could not load credit history."));
      setLedger(Array.isArray(data.entries) ? data.entries : []);
    } catch (e) {
      setError(e.message || "Could not load credit history.");
    } finally {
      setLedgerLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token || initializing) return;
    loadLedger();
  }, [token, initializing, loadLedger]);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setBanner("Credits added to your account successfully!");
      refreshUser?.();
      loadLedger();
      setSearchParams({}, { replace: true });
    } else if (searchParams.get("cancelled") === "true") {
      setBanner("Checkout cancelled. No charges were made.");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, refreshUser, loadLedger]);

  useEffect(() => {
    if (!token || giftQuery.trim().length < 3) {
      setGiftResults([]);
      return undefined;
    }
    const handle = setTimeout(async () => {
      setGiftSearching(true);
      try {
        const q = encodeURIComponent(giftQuery.trim());
        const { res } = await authFetch(token, `/users/search?q=${q}`);
        const data = await res.json().catch(() => []);
        setGiftResults(Array.isArray(data) ? data : []);
      } catch {
        setGiftResults([]);
      } finally {
        setGiftSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [giftQuery, token]);

  async function startCheckout(recipientUserId) {
    if (!token) return;
    setError("");
    const n = resolvedAmount;
    if (n == null || n < 5) {
      setError("Select or enter an amount of at least $5.00");
      return;
    }
    setCheckoutBusy(true);
    try {
      const body = {
        amount_dollars: n,
        recipient_user_id: recipientUserId ?? null,
      };
      const { res, unauthorized } = await authFetch(token, "/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (unauthorized) {
        setError("Session expired. Please sign in again.");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 503) {
        setPaymentsDisabled(true);
        throw new Error(formatApiError(data?.detail, "Payments not yet enabled"));
      }
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Could not start checkout."));
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      throw new Error("No checkout URL returned.");
    } catch (e) {
      setError(e.message || "Checkout failed.");
    } finally {
      setCheckoutBusy(false);
    }
  }

  if (!initializing && !user) {
    return <Navigate to="/login" replace state={{ from: "/credits" }} />;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-appBg text-slate-100">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Your balance</p>
          <p className="mt-2 text-4xl font-bold tabular-nums text-neonTeal">{formatMoney(balance)}</p>
        </div>

        {banner ? (
          <div className="mb-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {banner}
          </div>
        ) : null}

        {paymentsDisabled ? (
          <div className="mb-6 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Credit purchases are not enabled yet. Set <code className="text-amber-200">PAYMENTS_ENABLED=true</code> on
            the backend to test Stripe Checkout.
          </div>
        ) : null}

        {error ? (
          <div className="mb-6 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <section className="mb-8 rounded-2xl border border-white/10 bg-cardBg p-5">
          <h2 className="text-lg font-semibold text-white">Add Credits</h2>
          <p className="mt-1 text-sm text-slate-400">Load credits into your account via Stripe (test mode).</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {PRESET_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                disabled={paymentsDisabled || checkoutBusy}
                onClick={() => {
                  setSelectedAmount(amt);
                  setCustomAmount("");
                }}
                className={`min-h-[44px] rounded-xl border px-4 text-sm font-semibold transition ${
                  selectedAmount === amt
                    ? "border-neonTeal bg-teal-500/20 text-neonTeal"
                    : "border-white/15 text-slate-300 hover:border-teal-500/40"
                }`}
              >
                ${amt}
              </button>
            ))}
          </div>

          <div className="mt-4">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Or enter a custom amount
            </label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                min="5"
                step="0.01"
                disabled={paymentsDisabled || checkoutBusy}
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedAmount(null);
                }}
                placeholder="5.00"
                className="min-h-[44px] w-full rounded-xl border border-white/15 bg-cardBg2 py-2 pl-7 pr-3 text-slate-100"
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">Minimum $5.00</p>
          </div>

          <button
            type="button"
            disabled={paymentsDisabled || checkoutBusy || resolvedAmount == null || resolvedAmount < 5}
            onClick={() => startCheckout(null)}
            className="mt-5 min-h-[48px] w-full rounded-xl bg-neonTeal font-semibold text-slate-950 disabled:opacity-50"
          >
            {checkoutBusy ? "Redirecting to Stripe…" : "Load Credits"}
          </button>
        </section>

        <section className="mb-8 rounded-2xl border border-white/10 bg-cardBg p-5">
          <h2 className="text-lg font-semibold text-white">Gift Credits</h2>
          <p className="mt-1 text-sm text-slate-400">
            Load credits into another user&apos;s account (e.g. a child) by email or display name.
          </p>

          <div className="mt-4">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Find recipient</label>
            <input
              type="text"
              disabled={paymentsDisabled || checkoutBusy}
              value={giftQuery}
              onChange={(e) => {
                setGiftQuery(e.target.value);
                setGiftRecipient(null);
              }}
              placeholder="Search by email or display name (min 3 characters)"
              className="mt-1 min-h-[44px] w-full rounded-xl border border-white/15 bg-cardBg2 px-3 py-2 text-slate-100"
            />
            {giftSearching ? <p className="mt-1 text-xs text-slate-500">Searching…</p> : null}
            {giftResults.length > 0 && !giftRecipient ? (
              <ul className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-white/10 bg-cardBg2">
                {giftResults.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/5"
                      onClick={() => {
                        setGiftRecipient(u);
                        setGiftQuery(u.display_name);
                        setGiftResults([]);
                      }}
                    >
                      {u.display_name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {giftRecipient ? (
              <p className="mt-2 text-sm text-teal-200">
                Gifting to: <span className="font-semibold text-white">{giftRecipient.display_name}</span>{" "}
                <button
                  type="button"
                  className="ml-2 text-xs text-slate-400 underline"
                  onClick={() => {
                    setGiftRecipient(null);
                    setGiftQuery("");
                  }}
                >
                  Change
                </button>
              </p>
            ) : null}
          </div>

          <button
            type="button"
            disabled={
              paymentsDisabled ||
              checkoutBusy ||
              !giftRecipient ||
              resolvedAmount == null ||
              resolvedAmount < 5
            }
            onClick={() => startCheckout(giftRecipient?.id)}
            className="mt-5 min-h-[48px] w-full rounded-xl border border-teal-500/40 bg-teal-500/10 font-semibold text-neonTeal disabled:opacity-50"
          >
            {checkoutBusy ? "Redirecting to Stripe…" : "Gift Credits via Stripe"}
          </button>
        </section>

        <section className="rounded-2xl border border-white/10 bg-cardBg p-5">
          <h2 className="text-lg font-semibold text-white">Credit History</h2>
          {ledgerLoading ? (
            <div className="mt-6 flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-neonTeal" />
            </div>
          ) : paymentsDisabled ? (
            <p className="mt-4 text-sm text-slate-500">History unavailable while payments are disabled.</p>
          ) : ledger.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No transactions yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {ledger.map((row) => {
                const amt = Number(row.amount);
                const positive = amt >= 0;
                return (
                  <li
                    key={row.id}
                    className="rounded-xl border border-white/10 bg-cardBg2 px-3 py-3 text-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-white">{txTypeLabel(row.transaction_type)}</p>
                        {row.note ? <p className="mt-0.5 text-xs text-slate-500">{row.note}</p> : null}
                        <p className="mt-1 text-xs text-slate-600">{formatLedgerDate(row.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold tabular-nums ${positive ? "text-emerald-300" : "text-rose-300"}`}>
                          {positive ? "+" : ""}
                          {formatMoney(amt)}
                        </p>
                        <p className="text-xs text-slate-500">Balance {formatMoney(row.balance_after)}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="mt-6 text-center text-xs text-slate-600">
          Test card: 4242 4242 4242 4242 · any future expiry · any CVC
        </p>
      </main>
      <AppFooter />
    </div>
  );
}
