import React, { useCallback, useEffect, useState } from "react";
import { API_BASE_URL, authHeaders } from "../../config/api";
import { formatApiError } from "../../utils/authFetch";
import { formatMoney } from "../../utils/marketplace";
import { formatLedgerDateTime, profileTransactionMeta } from "../../utils/profileLedger";

const LEDGER_PAGE_SIZE = 10;

const FILTER_OPTIONS = [
  { id: "all", label: "All" },
  { id: "credits", label: "Credits" },
  { id: "marketplace", label: "Marketplace" },
  { id: "withdrawals", label: "Withdrawals" },
];

function ProfileLedgerRow({ row }) {
  const amt = Number(row.amount);
  const positive = amt >= 0;
  const meta = profileTransactionMeta(row);

  return (
    <li className="credit-ledger-row">
      <div className="credit-ledger-row__left">
        <div className="credit-ledger-row__type">
          <span className={`profile-tx-dot ${meta.dotClass}`} aria-hidden />
          {meta.icon !== "•" ? (
            <span className="credit-ledger-row__icon" aria-hidden>
              {meta.icon}
            </span>
          ) : null}
        </div>
        <p className="credit-ledger-row__description">{meta.description}</p>
        <p className="credit-ledger-row__date">{formatLedgerDateTime(row.created_at)}</p>
      </div>
      <div className="credit-ledger-row__right">
        <p className={`credit-ledger-row__amount ${meta.amountClass}`}>
          {positive ? "+" : ""}
          {formatMoney(amt)}
        </p>
        <p className="credit-ledger-row__balance">Balance {formatMoney(row.balance_after)}</p>
      </div>
    </li>
  );
}

export default function ProfileTransactionHistory({ token }) {
  const [category, setCategory] = useState("all");
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");

  const loadLedger = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const catParam = category !== "all" ? `&category=${encodeURIComponent(category)}` : "";
      const res = await fetch(
        `${API_BASE_URL}/credits/ledger?limit=${LEDGER_PAGE_SIZE}&offset=0${catParam}`,
        { headers: { ...authHeaders(token) }, cache: "no-store" }
      );
      const data = await res.json().catch(() => ({}));
      if (res.status === 503) {
        setLedger([]);
        setHasMore(false);
        return;
      }
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Could not load transactions."));
      const entries = Array.isArray(data.entries) ? data.entries : [];
      setLedger(entries);
      setHasMore(entries.length === LEDGER_PAGE_SIZE);
    } catch (e) {
      setError(e.message || "Could not load transactions.");
      setLedger([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [token, category]);

  const loadMore = useCallback(async () => {
    if (!token || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const catParam = category !== "all" ? `&category=${encodeURIComponent(category)}` : "";
      const res = await fetch(
        `${API_BASE_URL}/credits/ledger?limit=${LEDGER_PAGE_SIZE}&offset=${ledger.length}${catParam}`,
        { headers: { ...authHeaders(token) }, cache: "no-store" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Could not load more transactions."));
      const entries = Array.isArray(data.entries) ? data.entries : [];
      setLedger((prev) => [...prev, ...entries]);
      setHasMore(entries.length === LEDGER_PAGE_SIZE);
    } catch (e) {
      setError(e.message || "Could not load more transactions.");
    } finally {
      setLoadingMore(false);
    }
  }, [token, category, ledger.length, loadingMore, hasMore]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  return (
    <section id="transaction-history" className="profile-transaction-history">
      <h2 className="profile-section-title">Transaction History</h2>
      <div className="collection-filter-row profile-transaction-history__filters" role="tablist">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={category === opt.id}
            className={`collection-filter-pill${category === opt.id ? " collection-filter-pill--active" : ""}`}
            onClick={() => setCategory(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {error ? <p className="profile-transaction-history__error">{error}</p> : null}
      {loading ? (
        <p className="profile-transaction-history__loading">Loading transactions…</p>
      ) : ledger.length === 0 ? (
        <p className="profile-transaction-history__empty">No transactions yet.</p>
      ) : (
        <ul className="credit-ledger-list">
          {ledger.map((row) => (
            <ProfileLedgerRow key={row.id} row={row} />
          ))}
        </ul>
      )}
      {hasMore ? (
        <button
          type="button"
          className="credit-ledger-show-more"
          onClick={loadMore}
          disabled={loadingMore}
        >
          {loadingMore ? "Loading…" : "Show More"}
        </button>
      ) : null}
    </section>
  );
}
