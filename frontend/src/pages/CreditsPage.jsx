import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import MarketplaceConnectPrompt from "../components/MarketplaceConnectPrompt";
import { useAuth } from "../context/AuthContext";
import { authFetch, formatApiError } from "../utils/authFetch";
import { formatMoney } from "../utils/marketplace";
import {
  MIN_CREDIT_LOAD,
  isValidCreditLoadAmount,
  minCreditPurchaseError,
  minCreditPurchaseLabel,
} from "../utils/credits";
import { updateLastActive } from "../utils/activityTracker";

const PRESET_AMOUNTS = [10, 20, 50, 100];
const LEDGER_PAGE_SIZE = 10;

const LEDGER_TYPE_ICONS = {
  top_up: "💳",
  gift: "🎁",
  card_purchase: "🃏",
  card_sale: "💰",
  royalty: "👑",
  generation: "✨",
  animation: "⚡",
  highlight: "🎬",
  priority: "⭐",
  withdrawal: "↧",
  refund: "↩",
};

function ledgerTypeIcon(type) {
  return LEDGER_TYPE_ICONS[(type || "").toLowerCase()] || "•";
}

function ledgerDescription(row) {
  const note = (row?.note || "").trim();
  if (note) return note;
  return txTypeLabel(row?.transaction_type);
}

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
    highlight: "Highlight video",
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

function LoadAmountPicker({
  selectedAmount,
  onSelectPreset,
  customAmount,
  onCustomChange,
  disabled,
}) {
  const customAmountBelowMinimum =
    selectedAmount == null &&
    customAmount !== "" &&
    Number.isFinite(Number(customAmount)) &&
    Number(customAmount) > 0 &&
    Number(customAmount) < MIN_CREDIT_LOAD;

  return (
    <>
      <div className="mt-4 flex flex-wrap gap-2">
        {PRESET_AMOUNTS.map((amt) => (
          <button
            key={amt}
            type="button"
            disabled={disabled}
            onClick={() => onSelectPreset(amt)}
            className={`min-h-[44px] rounded-xl border px-4 text-sm font-semibold transition ${
              selectedAmount === amt
                ? "marketplace-tab marketplace-tab--active border-[var(--color-gold-primary)]"
                : "border-white/15 text-slate-300 hover:border-[var(--color-border-gold)]"
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
            min={MIN_CREDIT_LOAD}
            step="0.01"
            disabled={disabled}
            value={customAmount}
            onChange={(e) => onCustomChange(e.target.value)}
            placeholder={minCreditPurchaseLabel().replace("$", "")}
            className={`min-h-[44px] w-full rounded-xl border bg-cardBg2 py-2 pl-7 pr-3 text-slate-100 ${
              customAmountBelowMinimum ? "border-rose-500/50" : "border-white/15"
            }`}
          />
        </div>
        {customAmountBelowMinimum ? (
          <p className="mt-1 text-xs text-rose-300">{minCreditPurchaseError()}</p>
        ) : null}
        <p className="mt-1 text-[12px]" style={{ color: "var(--text-muted)" }}>
          Minimum purchase: {minCreditPurchaseLabel()}
        </p>
      </div>
    </>
  );
}

function CreditLedgerRow({ row }) {
  const amt = Number(row.amount);
  const positive = amt >= 0;
  const type = (row.transaction_type || "").toLowerCase();

  return (
    <li className="credit-ledger-row">
      <div className="credit-ledger-row__left">
        <div className="credit-ledger-row__type">
          <span className="credit-ledger-row__icon" aria-hidden>
            {ledgerTypeIcon(type)}
          </span>
          {type === "withdrawal" ? (
            <span className="credit-ledger-row__type-label credit-ledger-row__type-label--withdrawal">
              {txTypeLabel(type)}
            </span>
          ) : (
            <span className="credit-ledger-row__type-label">{txTypeLabel(type)}</span>
          )}
        </div>
        <p className="credit-ledger-row__description">{ledgerDescription(row)}</p>
        <p className="credit-ledger-row__date">{formatLedgerDate(row.created_at)}</p>
      </div>
      <div className="credit-ledger-row__right">
        <p
          className={`credit-ledger-row__amount${positive ? " credit-ledger-row__amount--credit" : " credit-ledger-row__amount--debit"}`}
        >
          {positive ? "+" : ""}
          {formatMoney(amt)}
        </p>
        <p className="credit-ledger-row__balance">Balance {formatMoney(row.balance_after)}</p>
      </div>
    </li>
  );
}

export default function CreditsPage() {
  const { user, token, initializing, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedAmount, setSelectedAmount] = useState(20);
  const [customAmount, setCustomAmount] = useState("");
  const [ledger, setLedger] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [ledgerLoadingMore, setLedgerLoadingMore] = useState(false);
  const [hasMoreLedger, setHasMoreLedger] = useState(false);
  const [paymentsDisabled, setPaymentsDisabled] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawConfirmOpen, setWithdrawConfirmOpen] = useState(false);
  const [withdrawSuccessOpen, setWithdrawSuccessOpen] = useState(false);
  const [withdrawErrorOpen, setWithdrawErrorOpen] = useState(false);
  const [withdrawErrorModalMessage, setWithdrawErrorModalMessage] = useState("");
  const [withdrawSuccessData, setWithdrawSuccessData] = useState(null);
  const [payoutsEnabled, setPayoutsEnabled] = useState(false);
  const [chargesEnabled, setChargesEnabled] = useState(false);
  const [connectProfile, setConnectProfile] = useState(null);
  const [marketplaceBalance, setMarketplaceBalance] = useState(0);
  const [profileLoading, setProfileLoading] = useState(true);
  const [marketplaceCheckoutBusy, setMarketplaceCheckoutBusy] = useState(false);
  const [error, setError] = useState("");
  const [banner, setBanner] = useState("");

  const balance = marketplaceBalance;

  const parsedWithdrawAmount = useMemo(() => {
    const n = Number(withdrawAmount);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [withdrawAmount]);

  const withdrawValid =
    parsedWithdrawAmount != null &&
    parsedWithdrawAmount >= 5 &&
    parsedWithdrawAmount <= balance;

  const resolvedAmount = useMemo(() => {
    if (selectedAmount != null) return selectedAmount;
    const n = Number(customAmount);
    if (Number.isFinite(n) && n > 0) return n;
    return null;
  }, [selectedAmount, customAmount]);

  const loadMarketplaceButtonLabel = useMemo(() => {
    if (marketplaceCheckoutBusy) return "Redirecting to Stripe…";
    if (resolvedAmount == null || !isValidCreditLoadAmount(resolvedAmount)) return "Load Marketplace Funds";
    const amountLabel = Number.isInteger(resolvedAmount)
      ? `$${resolvedAmount}`
      : formatMoney(resolvedAmount);
    return `Load ${amountLabel} to Marketplace`;
  }, [marketplaceCheckoutBusy, resolvedAmount]);

  const checkoutAmountValid = resolvedAmount != null && isValidCreditLoadAmount(resolvedAmount);

  function selectPresetAmount(amt) {
    setSelectedAmount(amt);
    setCustomAmount("");
  }

  function changeCustomAmount(value) {
    setCustomAmount(value);
    setSelectedAmount(null);
  }

  const loadLedger = useCallback(async () => {
    if (!token) return;
    setLedgerLoading(true);
    try {
      const { res, unauthorized } = await authFetch(
        token,
        `/credits/ledger?limit=${LEDGER_PAGE_SIZE}&offset=0`
      );
      if (unauthorized) return;
      if (res.status === 503) {
        setPaymentsDisabled(true);
        setLedger([]);
        setHasMoreLedger(false);
        return;
      }
      if (res.ok) {
        setPaymentsDisabled(false);
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Could not load credit history."));
      const entries = Array.isArray(data.entries) ? data.entries : [];
      setLedger(entries);
      setHasMoreLedger(entries.length === LEDGER_PAGE_SIZE);
    } catch (e) {
      setError(e.message || "Could not load credit history.");
    } finally {
      setLedgerLoading(false);
    }
  }, [token]);

  const loadMoreLedger = useCallback(async () => {
    if (!token || ledgerLoadingMore || !hasMoreLedger) return;
    setLedgerLoadingMore(true);
    try {
      const { res, unauthorized } = await authFetch(
        token,
        `/credits/ledger?limit=${LEDGER_PAGE_SIZE}&offset=${ledger.length}`
      );
      if (unauthorized) return;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Could not load more transactions."));
      const entries = Array.isArray(data.entries) ? data.entries : [];
      setLedger((prev) => [...prev, ...entries]);
      setHasMoreLedger(entries.length === LEDGER_PAGE_SIZE);
    } catch (e) {
      setError(e.message || "Could not load more transactions.");
    } finally {
      setLedgerLoadingMore(false);
    }
  }, [token, ledger.length, ledgerLoadingMore, hasMoreLedger]);

  useEffect(() => {
    if (!token || initializing) return;
    loadLedger();
  }, [token, initializing, loadLedger]);

  const applyConnectStatus = useCallback((status) => {
    if (!status) return;
    setConnectProfile((prev) => ({ ...(prev || {}), ...status }));
    setPayoutsEnabled(
      status.stripe_payouts_enabled === true || status.payouts_enabled === true
    );
    setChargesEnabled(
      status.stripe_charges_enabled === true || status.charges_enabled === true
    );
  }, []);

  const refreshConnectStatus = useCallback(async () => {
    if (!token) return null;
    const { res, unauthorized } = await authFetch(token, "/connect/status");
    if (unauthorized) return null;
    if (res.status === 503) {
      setPaymentsDisabled(true);
      return null;
    }
    if (res.ok) {
      setPaymentsDisabled(false);
      const status = await res.json().catch(() => ({}));
      applyConnectStatus(status);
      return status;
    }
    return null;
  }, [token, applyConnectStatus]);

  const loadBalancesAndProfile = useCallback(async () => {
    if (!token) return;
    setProfileLoading(true);
    try {
      const [connectRes, balRes, profileRes] = await Promise.all([
        authFetch(token, "/connect/status"),
        authFetch(token, "/credits/balance"),
        authFetch(token, "/auth/profile"),
      ]);
      if (connectRes.res.status === 503 || balRes.res.status === 503) {
        setPaymentsDisabled(true);
      } else if (connectRes.res.ok || balRes.res.ok) {
        setPaymentsDisabled(false);
      }
      if (connectRes.res.ok) {
        applyConnectStatus(await connectRes.res.json().catch(() => ({})));
      }
      if (balRes.res.ok) {
        const balData = await balRes.res.json().catch(() => ({}));
        setMarketplaceBalance(Number(balData.marketplace_balance) || 0);
      }
      if (profileRes.res.ok) {
        const data = await profileRes.res.json().catch(() => ({}));
        setConnectProfile((prev) => ({ ...(prev || {}), ...data }));
        if (!connectRes.res.ok) {
          setPayoutsEnabled(data.stripe_payouts_enabled === true);
          setChargesEnabled(data.stripe_charges_enabled === true);
        }
      }
    } catch {
      /* keep existing connect/payments state on transient errors */
    } finally {
      setProfileLoading(false);
    }
  }, [token, applyConnectStatus]);

  useEffect(() => {
    if (!token || initializing) {
      setProfileLoading(false);
      return;
    }
    if (searchParams.get("connect")) return;
    loadBalancesAndProfile();
  }, [token, initializing, loadBalancesAndProfile, searchParams]);

  useEffect(() => {
    const connect = searchParams.get("connect");
    if (connect !== "complete" && connect !== "refresh") return undefined;
    if (!token || initializing) return undefined;

    let cancelled = false;
    (async () => {
      setProfileLoading(true);
      updateLastActive();
      await Promise.all([
        refreshConnectStatus(),
        refreshUser?.(token),
        loadBalancesAndProfile(),
        loadLedger(),
      ]);
      if (cancelled) return;
      setBanner(
        connect === "complete"
          ? "Stripe connected successfully! You can load marketplace funds and withdraw earnings."
          : "Please finish Stripe verification to enable marketplace payouts."
      );
      setSearchParams({}, { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [
    searchParams,
    token,
    initializing,
    refreshConnectStatus,
    refreshUser,
    loadBalancesAndProfile,
    loadLedger,
    setSearchParams,
  ]);

  useEffect(() => {
    if (searchParams.get("connect")) return;
    if (searchParams.get("marketplace_success") === "true") {
      setBanner("Marketplace funds added successfully!");
      refreshUser?.();
      loadLedger();
      loadBalancesAndProfile();
      setSearchParams({}, { replace: true });
    } else if (searchParams.get("marketplace_cancelled") === "true") {
      setBanner("Marketplace checkout cancelled. No charges were made.");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, refreshUser, loadLedger, loadBalancesAndProfile]);

  function openWithdrawConfirm() {
    setWithdrawError("");
    const n = parsedWithdrawAmount;
    if (n == null || n < 5) {
      setWithdrawError("Minimum withdrawal is $5.00");
      return;
    }
    if (n > balance) {
      setWithdrawError("Insufficient marketplace balance");
      return;
    }
    setWithdrawConfirmOpen(true);
  }

  async function submitWithdrawal() {
    if (!token) return;
    const n = parsedWithdrawAmount;
    if (n == null || n < 5 || n > balance) return;

    setWithdrawConfirmOpen(false);
    setWithdrawBusy(true);
    try {
      const { res, unauthorized } = await authFetch(token, "/credits/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_dollars: n }),
      });
      if (unauthorized) {
        setWithdrawErrorModalMessage("Session expired. Please sign in again.");
        setWithdrawErrorOpen(true);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 503) {
        setPaymentsDisabled(true);
        throw new Error(formatApiError(data?.detail, "Payments not yet enabled"));
      }
      if (!res.ok) {
        throw new Error(
          formatApiError(
            data?.detail,
            "Your withdrawal could not be processed. Please try again or contact support."
          )
        );
      }
      const newBalance = Number(data.marketplace_balance ?? data.credit_balance);
      setMarketplaceBalance(Number.isFinite(newBalance) ? newBalance : balance - n);
      setWithdrawAmount("");
      await Promise.all([refreshUser?.(), loadLedger()]);
      setWithdrawSuccessData({
        amount: n,
        newBalance: Number.isFinite(newBalance) ? newBalance : balance - n,
      });
      setWithdrawSuccessOpen(true);
    } catch (e) {
      await Promise.all([refreshUser?.(), loadLedger()]);
      setWithdrawErrorModalMessage(
        e.message ||
          "Your withdrawal could not be processed. Please try again or contact support."
      );
      setWithdrawErrorOpen(true);
    } finally {
      setWithdrawBusy(false);
    }
  }

  async function startMarketplaceCheckout() {
    if (!token) return;
    setError("");
    const n = resolvedAmount;
    if (n == null || !isValidCreditLoadAmount(n)) {
      setError(`Select or enter an amount of at least ${minCreditPurchaseLabel()}`);
      return;
    }
    setMarketplaceCheckoutBusy(true);
    try {
      const { res, unauthorized } = await authFetch(token, "/credits/marketplace-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_dollars: n }),
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
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Could not start marketplace checkout."));
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      throw new Error("No checkout URL returned.");
    } catch (e) {
      setError(e.message || "Checkout failed.");
    } finally {
      setMarketplaceCheckoutBusy(false);
    }
  }

  if (!initializing && !token && !user) {
    return <Navigate to="/login" replace state={{ from: "/credits" }} />;
  }

  if (initializing || (token && !user)) {
    return (
      <div className="min-h-screen bg-appBg text-slate-100">
        <AppHeader />
        <main className="mx-auto flex max-w-2xl justify-center px-4 py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-[var(--color-gold-primary)]" />
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-appBg text-slate-100">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-2xl border border-white/10 bg-cardBg p-5 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Marketplace balance</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-brand-gold">{formatMoney(marketplaceBalance)}</p>
          <p className="mt-1 text-xs text-slate-500">Buy & sell cards on the marketplace — not usable in Studio</p>
        </div>

        {banner ? (
          <div className="mb-6 rounded-xl border bg-success-subtle px-4 py-3 text-sm text-success">
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
          <h2 className="text-lg font-semibold text-white">Load Marketplace Funds</h2>
          <p className="mt-1 text-sm text-slate-400">
            Add spending balance for marketplace purchases. Requires a Stripe Connect account (Express).
          </p>
          <LoadAmountPicker
            selectedAmount={selectedAmount}
            onSelectPreset={selectPresetAmount}
            customAmount={customAmount}
            onCustomChange={changeCustomAmount}
            disabled={paymentsDisabled || marketplaceCheckoutBusy}
          />

          <div className="mt-4">
            <MarketplaceConnectPrompt
              profile={connectProfile}
              token={token}
              compact
              returnPath="/credits"
            />
          </div>
          <button
            type="button"
            disabled={paymentsDisabled || marketplaceCheckoutBusy || !checkoutAmountValid}
            onClick={startMarketplaceCheckout}
            className="mt-5 min-h-[48px] w-full rounded-xl btn-primary font-semibold text-slate-950 disabled:opacity-50"
          >
            {loadMarketplaceButtonLabel}
          </button>
        </section>

        <section id="withdraw" className="mb-8 rounded-2xl border border-white/10 bg-cardBg p-5">
          <h2 className="text-lg font-semibold text-white">Withdraw Marketplace Earnings</h2>
          {profileLoading ? (
            <div className="mt-6 flex justify-center py-6">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-[var(--color-gold-primary)]" />
            </div>
          ) : balance <= 0 ? (
            <p className="mt-3 text-sm text-slate-400">
              You have no marketplace balance to withdraw. Sell cards on the marketplace to earn funds.
            </p>
          ) : payoutsEnabled ? (
            <>
              <p className="mt-1 text-sm text-slate-400">
                Payout from your Stripe Express account to your linked bank. Timing follows Stripe&apos;s payout
                schedule (typically 2–7 business days in test mode).
              </p>
              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-500">Available to withdraw</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-brand-gold">{formatMoney(balance)}</p>

              {withdrawError ? (
                <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {withdrawError}
                </div>
              ) : null}

              <div className="mt-4">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Withdrawal amount
                </label>
                <div className="relative mt-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    min="5"
                    max={balance}
                    step="0.01"
                    disabled={paymentsDisabled || withdrawBusy}
                    value={withdrawAmount}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        setWithdrawAmount("");
                        setWithdrawError("");
                        return;
                      }
                      const n = Number(raw);
                      if (Number.isFinite(n) && n > balance) {
                        setWithdrawError("Amount cannot exceed your balance");
                      } else {
                        setWithdrawError("");
                      }
                      setWithdrawAmount(raw);
                    }}
                    placeholder="5.00"
                    className="min-h-[44px] w-full rounded-xl border border-white/15 bg-cardBg2 py-2 pl-7 pr-3 text-slate-100"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Minimum $5.00 · Maximum {formatMoney(balance)}
                </p>
              </div>

              <button
                type="button"
                disabled={paymentsDisabled || withdrawBusy || !withdrawValid}
                onClick={openWithdrawConfirm}
                className="mt-5 min-h-[48px] w-full rounded-xl btn-primary font-semibold text-slate-950 disabled:opacity-50"
              >
                {withdrawBusy ? "Processing withdrawal…" : "Withdraw to Bank"}
              </button>
              <p className="mt-3 text-center text-xs text-slate-500">
                Funds typically arrive in 2-3 business days
              </p>
            </>
          ) : (
            <>
              <MarketplaceConnectPrompt
                profile={connectProfile}
                token={token}
                compact
                requireSellReady
                returnPath="/credits"
              />
              <p className="mt-3 text-sm text-slate-400">
                Complete Stripe onboarding to withdraw marketplace earnings to your bank.
              </p>
              <Link
                to="/profile"
                className="mt-5 flex min-h-[48px] w-full items-center justify-center rounded-xl btn-secondary font-semibold"
              >
                Manage payout settings
              </Link>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-cardBg p-5">
          <h2 className="text-lg font-semibold text-white">Transaction History</h2>
          <p className="mt-1 text-sm text-slate-500">
            Includes marketplace activity and legacy card-creation credits.
          </p>
          {ledgerLoading ? (
            <div className="mt-6 flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-[var(--color-gold-primary)]" />
            </div>
          ) : paymentsDisabled ? (
            <p className="mt-4 text-sm text-slate-500">History unavailable while payments are disabled.</p>
          ) : ledger.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No transactions yet.</p>
          ) : (
            <>
              <ul className="credit-ledger-list mt-4">
                {ledger.map((row) => (
                  <CreditLedgerRow key={row.id} row={row} />
                ))}
              </ul>
              {hasMoreLedger ? (
                <button
                  type="button"
                  className="credit-ledger-show-more"
                  disabled={ledgerLoadingMore}
                  onClick={loadMoreLedger}
                >
                  {ledgerLoadingMore ? "Loading…" : "Show More Transactions"}
                </button>
              ) : null}
            </>
          )}
        </section>

        <p className="mt-6 text-center text-xs text-slate-600">
          Test card: 4242 4242 4242 4242 · any future expiry · any CVC
        </p>
      </main>

      {withdrawConfirmOpen && parsedWithdrawAmount != null ? (
        <div className="mobile-bottom-sheet-overlay fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center sm:p-4">
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-cardBg p-5 shadow-2xl sm:p-6"
            role="dialog"
            aria-labelledby="withdraw-confirm-title"
            aria-modal="true"
          >
            <h3 id="withdraw-confirm-title" className="text-lg font-semibold text-white">
              Confirm Withdrawal
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              You are about to withdraw{" "}
              <span className="font-semibold text-white">{formatMoney(parsedWithdrawAmount)}</span> to
              your connected bank account.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Funds typically arrive within 2-3 business days. This action cannot be undone.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={withdrawBusy}
                onClick={() => setWithdrawConfirmOpen(false)}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-white/20 px-4 text-sm font-medium text-slate-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={withdrawBusy}
                onClick={submitWithdrawal}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl btn-primary px-4 text-sm font-semibold text-slate-950 disabled:opacity-50"
              >
                Confirm Withdrawal
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {withdrawSuccessOpen && withdrawSuccessData ? (
        <div className="mobile-bottom-sheet-overlay fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center sm:p-4">
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-cardBg p-5 shadow-2xl sm:p-6"
            role="dialog"
            aria-labelledby="withdraw-success-title"
            aria-modal="true"
          >
            <h3 id="withdraw-success-title" className="text-center text-lg font-semibold text-white">
              Withdrawal Initiated! 🎉
            </h3>
            <p className="mt-3 text-center text-sm leading-relaxed text-slate-300">
              Your withdrawal of {formatMoney(withdrawSuccessData.amount)} has been sent to your
              connected bank account.
            </p>
            <p className="mt-4 text-center text-3xl font-bold tabular-nums text-brand-gold">
              {formatMoney(withdrawSuccessData.amount)}
            </p>
            <p className="mt-4 text-center text-xs leading-relaxed text-slate-500">
              Funds typically arrive within 2-3 business days. You will receive a confirmation email
              shortly.
            </p>
            <p className="mt-4 text-center text-sm text-slate-300">
              Your new marketplace balance:{" "}
              <span className="font-semibold tabular-nums text-white">
                {formatMoney(withdrawSuccessData.newBalance)}
              </span>
            </p>
            <button
              type="button"
              onClick={() => {
                setWithdrawSuccessOpen(false);
                setWithdrawSuccessData(null);
              }}
              className="mt-6 min-h-[48px] w-full rounded-xl btn-primary font-semibold text-slate-950"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}

      {withdrawErrorOpen ? (
        <div className="mobile-bottom-sheet-overlay fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center sm:p-4">
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-cardBg p-5 shadow-2xl sm:p-6"
            role="dialog"
            aria-labelledby="withdraw-error-title"
            aria-modal="true"
          >
            <h3 id="withdraw-error-title" className="text-lg font-semibold text-white">
              Withdrawal Failed
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              {withdrawErrorModalMessage ||
                "Your withdrawal could not be processed. Please try again or contact support."}
            </p>
            <button
              type="button"
              onClick={() => setWithdrawErrorOpen(false)}
              className="mt-6 min-h-[48px] w-full rounded-xl border border-white/20 font-medium text-slate-200"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      <AppFooter />
    </div>
  );
}
