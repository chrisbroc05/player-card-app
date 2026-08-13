import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useNavigate } from "react-router-dom";
import AppFooter from "../components/AppFooter";
import BrandLogo from "../components/BrandLogo";
import { ADMIN_TOKEN_STORAGE_KEY, API_BASE_URL, adminHeaders } from "../config/api";
import { motionLabel } from "../constants/animationMotions";
import { formatMoney, platformRoyaltyPercentLabel } from "../utils/marketplace";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Users" },
  { id: "cards", label: "Cards" },
  { id: "trades", label: "Trades" },
  { id: "marketplace", label: "Marketplace" },
  { id: "earnings", label: "Earnings" },
  { id: "financials", label: "Financials" },
];

const LEDGER_PAGE_SIZE = 25;
const EARNINGS_PAGE_SIZE = 25;
const MIN_ROYALTY_WITHDRAWAL_DOLLARS = 1;
const EARNINGS_DATE_RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "all", label: "All Time" },
];

const LEDGER_TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "top_up", label: "Top-up" },
  { value: "gift", label: "Gift" },
  { value: "card_sale", label: "Card sale" },
  { value: "card_purchase", label: "Card purchase" },
  { value: "withdrawal", label: "Withdrawal" },
  { value: "generation", label: "Generation" },
  { value: "animation", label: "Animation" },
  { value: "royalty", label: "Royalty" },
  { value: "refund", label: "Refund" },
];

function txBadgeClass(type) {
  const t = (type || "").toLowerCase();
  const map = {
    top_up: "bg-success-subtle text-success",
    card_sale: "border-[var(--color-border-gold)] bg-gold-subtle text-brand-gold",
    card_purchase: "border-orange-500/40 bg-orange-500/15 text-orange-200",
    withdrawal: "border-rose-500/40 bg-rose-500/15 text-rose-200",
    generation: "border-purple-500/40 bg-purple-500/15 text-purple-200",
    animation: "border-purple-500/40 bg-purple-500/15 text-purple-200",
    royalty: "border-slate-500/40 bg-slate-500/15 text-slate-300",
    gift: "border-[var(--color-border-gold)] bg-gold-subtle text-brand-gold",
  };
  return map[t] || "border-white/15 bg-white/5 text-slate-300";
}

function formatLedgerType(type) {
  const t = (type || "").toLowerCase();
  const labels = {
    top_up: "Top-up",
    gift: "Gift",
    card_sale: "Card sale",
    card_purchase: "Card purchase",
    withdrawal: "Withdrawal",
    generation: "Generation",
    animation: "Animation",
    royalty: "Royalty",
    refund: "Refund",
  };
  return labels[t] || type || "—";
}

function formatApiError(detail, fallback) {
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const msgs = detail.map((item) => (typeof item === "string" ? item : item?.msg)).filter(Boolean);
    return msgs.length ? msgs.join(" | ") : fallback;
  }
  if (typeof detail === "object" && detail?.message) return detail.message;
  return fallback;
}

function formatDateTime(value) {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString();
}

function tierBadgeClass(tier) {
  const t = (tier || "").toLowerCase().replace("-", "_");
  if (t === "rookie") return "bg-success-subtle text-success";
  if (t === "allstar" || t === "all_star") return "border-[var(--color-allstar)]/40 bg-[rgba(26,106,181,0.15)] text-slate-200";
  if (t === "legends") return "border-amber-500/40 bg-amber-500/15 text-amber-100";
  return "border-white/20 bg-white/5 text-slate-200";
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [cards, setCards] = useState([]);
  const [trades, setTrades] = useState([]);
  const [marketplaceOffers, setMarketplaceOffers] = useState([]);

  const [inviteCode, setInviteCode] = useState("");
  const [betaActive, setBetaActive] = useState(false);
  const [inviteDraft, setInviteDraft] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");

  const [tradeStatusFilter, setTradeStatusFilter] = useState("all");
  const [marketplaceStatusFilter, setMarketplaceStatusFilter] = useState("all");

  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerOffset, setLedgerOffset] = useState(0);
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState("all");
  const [royaltiesEntries, setRoyaltiesEntries] = useState([]);
  const [royaltiesTotal, setRoyaltiesTotal] = useState(0);
  const [royaltiesSum, setRoyaltiesSum] = useState(0);
  const [royaltiesOffset, setRoyaltiesOffset] = useState(0);
  const [royaltyBalance, setRoyaltyBalance] = useState(null);
  const [earningsEntries, setEarningsEntries] = useState([]);
  const [earningsTotalCount, setEarningsTotalCount] = useState(0);
  const [earningsFilteredTotal, setEarningsFilteredTotal] = useState(0);
  const [earningsOffset, setEarningsOffset] = useState(0);
  const [earningsDateRange, setEarningsDateRange] = useState("all");
  const [earningsSearch, setEarningsSearch] = useState("");
  const [earningsSort, setEarningsSort] = useState("desc");
  const [withdrawalHistoryEntries, setWithdrawalHistoryEntries] = useState([]);
  const [withdrawalHistoryTotal, setWithdrawalHistoryTotal] = useState(0);
  const [monthlyEarningsPoints, setMonthlyEarningsPoints] = useState([]);
  const [monthlyEarningsYearTotal, setMonthlyEarningsYearTotal] = useState(0);
  const [withdrawConfirmOpen, setWithdrawConfirmOpen] = useState(false);
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawStatusMsg, setWithdrawStatusMsg] = useState("");
  const [withdrawSuccessOpen, setWithdrawSuccessOpen] = useState(false);
  const [withdrawSuccessData, setWithdrawSuccessData] = useState(null);

  const [loading, setLoading] = useState({
    overview: true,
    users: true,
    cards: true,
    trades: true,
    marketplace: true,
    financialsLedger: false,
    financialsRoyalties: false,
    earningsSummary: false,
    earningsTable: false,
    earningsWithdrawals: false,
    earningsChart: false,
  });
  const [errors, setErrors] = useState({});
  const [userSort, setUserSort] = useState({ key: "display_name", dir: "asc" });
  const [userSearch, setUserSearch] = useState("");
  const [cardTierFilter, setCardTierFilter] = useState("all");
  const [cardAnimatedOnly, setCardAnimatedOnly] = useState(false);
  const [cardHighlightOnly, setCardHighlightOnly] = useState(false);
  const [cardDeletedOnly, setCardDeletedOnly] = useState(false);
  const [cardSearch, setCardSearch] = useState("");
  const [adminDeleteBusyId, setAdminDeleteBusyId] = useState("");

  const clearAdminAndRedirect = useCallback(() => {
    localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    navigate("/login", { replace: true });
  }, [navigate]);

  const adminFetch = useCallback(
    async (path, options = {}) => {
      const token = localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
      const res = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          Accept: "application/json",
          ...adminHeaders(token),
          ...options.headers,
        },
      });
      if (res.status === 401 || res.status === 403) {
        clearAdminAndRedirect();
        return null;
      }
      return res;
    },
    [clearAdminAndRedirect]
  );

  const loadInvite = useCallback(async () => {
    const res = await adminFetch("/admin/invite-codes");
    if (!res?.ok) return;
    const data = await res.json();
    setInviteCode(data.current_code || "");
    setBetaActive(Boolean(data.beta_mode_active));
    setInviteDraft(data.current_code || "");
  }, [adminFetch]);

  const loadStats = useCallback(async () => {
    setLoading((s) => ({ ...s, overview: true }));
    setErrors((e) => ({ ...e, overview: "" }));
    const res = await adminFetch("/admin/stats");
    if (!res) return;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErrors((e) => ({ ...e, overview: formatApiError(data?.detail, "Failed to load stats.") }));
      setLoading((s) => ({ ...s, overview: false }));
      return;
    }
    setStats(data);
    setLoading((s) => ({ ...s, overview: false }));
  }, [adminFetch]);

  const loadUsers = useCallback(async () => {
    setLoading((s) => ({ ...s, users: true }));
    setErrors((e) => ({ ...e, users: "" }));
    const res = await adminFetch("/admin/users");
    if (!res) return;
    const data = await res.json().catch(() => []);
    if (!res.ok) {
      setErrors((e) => ({ ...e, users: formatApiError(data?.detail, "Failed to load users.") }));
      setLoading((s) => ({ ...s, users: false }));
      return;
    }
    setUsers(Array.isArray(data) ? data : []);
    setLoading((s) => ({ ...s, users: false }));
  }, [adminFetch]);

  const loadCards = useCallback(async () => {
    setLoading((s) => ({ ...s, cards: true }));
    setErrors((e) => ({ ...e, cards: "" }));
    const res = await adminFetch("/admin/cards");
    if (!res) return;
    const data = await res.json().catch(() => []);
    if (!res.ok) {
      setErrors((e) => ({ ...e, cards: formatApiError(data?.detail, "Failed to load cards.") }));
      setLoading((s) => ({ ...s, cards: false }));
      return;
    }
    setCards(Array.isArray(data) ? data : []);
    setLoading((s) => ({ ...s, cards: false }));
  }, [adminFetch]);

  const loadTrades = useCallback(async () => {
    setLoading((s) => ({ ...s, trades: true }));
    setErrors((e) => ({ ...e, trades: "" }));
    const res = await adminFetch("/admin/trades");
    if (!res) return;
    const data = await res.json().catch(() => []);
    if (!res.ok) {
      setErrors((e) => ({ ...e, trades: formatApiError(data?.detail, "Failed to load trades.") }));
      setLoading((s) => ({ ...s, trades: false }));
      return;
    }
    setTrades(Array.isArray(data) ? data : []);
    setLoading((s) => ({ ...s, trades: false }));
  }, [adminFetch]);

  const loadMarketplace = useCallback(async () => {
    setLoading((s) => ({ ...s, marketplace: true }));
    setErrors((e) => ({ ...e, marketplace: "" }));
    const res = await adminFetch("/admin/marketplace");
    if (!res) return;
    const data = await res.json().catch(() => []);
    if (!res.ok) {
      setErrors((e) => ({ ...e, marketplace: formatApiError(data?.detail, "Failed to load marketplace.") }));
      setLoading((s) => ({ ...s, marketplace: false }));
      return;
    }
    setMarketplaceOffers(Array.isArray(data) ? data : []);
    setLoading((s) => ({ ...s, marketplace: false }));
  }, [adminFetch]);

  const loadFinancialsLedger = useCallback(async () => {
    setLoading((s) => ({ ...s, financialsLedger: true }));
    setErrors((e) => ({ ...e, financialsLedger: "" }));
    const params = new URLSearchParams({
      limit: String(LEDGER_PAGE_SIZE),
      offset: String(ledgerOffset),
    });
    if (ledgerTypeFilter !== "all") {
      params.set("transaction_type", ledgerTypeFilter);
    }
    const res = await adminFetch(`/admin/financials/ledger?${params}`);
    if (!res) return;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErrors((e) => ({
        ...e,
        financialsLedger: formatApiError(data?.detail, "Failed to load ledger."),
      }));
      setLoading((s) => ({ ...s, financialsLedger: false }));
      return;
    }
    setLedgerEntries(Array.isArray(data.entries) ? data.entries : []);
    setLedgerTotal(Number(data.total_count) || 0);
    setLoading((s) => ({ ...s, financialsLedger: false }));
  }, [adminFetch, ledgerOffset, ledgerTypeFilter]);

  const loadFinancialsRoyalties = useCallback(async () => {
    setLoading((s) => ({ ...s, financialsRoyalties: true }));
    setErrors((e) => ({ ...e, financialsRoyalties: "" }));
    const params = new URLSearchParams({
      limit: String(LEDGER_PAGE_SIZE),
      offset: String(royaltiesOffset),
    });
    const res = await adminFetch(`/admin/financials/royalties?${params}`);
    if (!res) return;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErrors((e) => ({
        ...e,
        financialsRoyalties: formatApiError(data?.detail, "Failed to load royalties."),
      }));
      setLoading((s) => ({ ...s, financialsRoyalties: false }));
      return;
    }
    setRoyaltiesEntries(Array.isArray(data.entries) ? data.entries : []);
    setRoyaltiesTotal(Number(data.total_count) || 0);
    setRoyaltiesSum(Number(data.total_royalties) || 0);
    setLoading((s) => ({ ...s, financialsRoyalties: false }));
  }, [adminFetch, royaltiesOffset]);

  const loadRoyaltyBalance = useCallback(async () => {
    setLoading((s) => ({ ...s, earningsSummary: true }));
    setErrors((e) => ({ ...e, earningsSummary: "" }));
    const res = await adminFetch("/admin/royalty-balance");
    if (!res) return;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErrors((e) => ({
        ...e,
        earningsSummary: formatApiError(data?.detail, "Failed to load royalty balance."),
      }));
      setLoading((s) => ({ ...s, earningsSummary: false }));
      return;
    }
    setRoyaltyBalance(data || null);
    setLoading((s) => ({ ...s, earningsSummary: false }));
  }, [adminFetch]);

  const loadEarningsEntries = useCallback(async () => {
    setLoading((s) => ({ ...s, earningsTable: true }));
    setErrors((e) => ({ ...e, earningsTable: "" }));
    const params = new URLSearchParams({
      limit: String(EARNINGS_PAGE_SIZE),
      offset: String(earningsOffset),
      date_range: earningsDateRange,
      sort: earningsSort,
    });
    if (earningsSearch.trim()) params.set("search", earningsSearch.trim());
    const res = await adminFetch(`/admin/financials/royalties?${params.toString()}`);
    if (!res) return;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErrors((e) => ({
        ...e,
        earningsTable: formatApiError(data?.detail, "Failed to load earnings history."),
      }));
      setLoading((s) => ({ ...s, earningsTable: false }));
      return;
    }
    setEarningsEntries(Array.isArray(data.entries) ? data.entries : []);
    setEarningsTotalCount(Number(data.total_count) || 0);
    setEarningsFilteredTotal(Number(data.total_royalties) || 0);
    setLoading((s) => ({ ...s, earningsTable: false }));
  }, [adminFetch, earningsDateRange, earningsOffset, earningsSearch, earningsSort]);

  const loadWithdrawalHistory = useCallback(async () => {
    setLoading((s) => ({ ...s, earningsWithdrawals: true }));
    setErrors((e) => ({ ...e, earningsWithdrawals: "" }));
    const res = await adminFetch("/admin/withdrawal-history?limit=5000&offset=0");
    if (!res) return;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErrors((e) => ({
        ...e,
        earningsWithdrawals: formatApiError(data?.detail, "Failed to load withdrawal history."),
      }));
      setLoading((s) => ({ ...s, earningsWithdrawals: false }));
      return;
    }
    setWithdrawalHistoryEntries(Array.isArray(data.entries) ? data.entries : []);
    setWithdrawalHistoryTotal(Number(data.total_count) || 0);
    setLoading((s) => ({ ...s, earningsWithdrawals: false }));
  }, [adminFetch]);

  const loadMonthlyEarnings = useCallback(async () => {
    setLoading((s) => ({ ...s, earningsChart: true }));
    setErrors((e) => ({ ...e, earningsChart: "" }));
    const res = await adminFetch("/admin/earnings/monthly");
    if (!res) return;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErrors((e) => ({
        ...e,
        earningsChart: formatApiError(data?.detail, "Failed to load monthly earnings chart."),
      }));
      setLoading((s) => ({ ...s, earningsChart: false }));
      return;
    }
    setMonthlyEarningsPoints(Array.isArray(data.points) ? data.points : []);
    setMonthlyEarningsYearTotal(Number(data.year_total) || 0);
    setLoading((s) => ({ ...s, earningsChart: false }));
  }, [adminFetch]);

  useEffect(() => {
    loadInvite();
    loadStats();
    loadUsers();
    loadCards();
    loadTrades();
    loadMarketplace();
  }, [loadInvite, loadStats, loadUsers, loadCards, loadTrades, loadMarketplace]);

  useEffect(() => {
    if (tab !== "financials") return;
    loadFinancialsLedger();
  }, [tab, loadFinancialsLedger]);

  useEffect(() => {
    if (tab !== "financials") return;
    loadFinancialsRoyalties();
  }, [tab, loadFinancialsRoyalties]);

  useEffect(() => {
    if (tab !== "earnings") return;
    loadRoyaltyBalance();
    loadWithdrawalHistory();
    loadMonthlyEarnings();
  }, [tab, loadRoyaltyBalance, loadWithdrawalHistory, loadMonthlyEarnings]);

  useEffect(() => {
    if (tab !== "earnings") return;
    loadEarningsEntries();
  }, [tab, loadEarningsEntries]);

  async function handleInviteUpdate(e) {
    e.preventDefault();
    setInviteMsg("");
    const res = await adminFetch("/admin/invite-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_code: inviteDraft }),
    });
    if (!res) return;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setInviteMsg(formatApiError(data?.detail, "Update failed."));
      return;
    }
    setInviteMsg("Invite code updated.");
    await loadInvite();
    setInviteDraft(data.new_code ?? inviteDraft);
  }

  async function handleExportEarningsCsv() {
    const params = new URLSearchParams({
      limit: "5000",
      offset: "0",
      date_range: earningsDateRange,
      sort: earningsSort,
    });
    if (earningsSearch.trim()) params.set("search", earningsSearch.trim());
    const res = await adminFetch(`/admin/financials/royalties?${params.toString()}`);
    if (!res) return;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErrors((e) => ({
        ...e,
        earningsTable: formatApiError(data?.detail, "Failed to export earnings CSV."),
      }));
      return;
    }
    const rows = Array.isArray(data.entries) ? data.entries : [];
    const header = [
      "Date",
      "Player Name",
      "Card ID",
      "Tier",
      "Seller",
      "Buyer",
      "Sale Price",
      "Royalty",
      "Running Total",
    ];
    const csvRows = rows.map((row) => [
      row.date || "",
      row.player_name || "",
      row.card_id || "",
      row.tier || "",
      row.seller_display_name || "",
      row.buyer_display_name || "",
      Number(row.sale_amount || 0).toFixed(2),
      Number(row.royalty_amount || 0).toFixed(2),
      Number(row.running_total || 0).toFixed(2),
    ]);
    const escapeCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [header, ...csvRows].map((line) => line.map(escapeCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `platform-earnings-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleWithdrawConfirm() {
    setWithdrawBusy(true);
    setWithdrawStatusMsg("");
    const res = await adminFetch("/admin/withdraw-royalties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = res ? await res.json().catch(() => ({})) : {};
    setWithdrawBusy(false);
    if (!res?.ok) {
      setWithdrawStatusMsg(formatApiError(data?.detail, "Withdrawal failed."));
      return;
    }
    const amount = Number(data?.amount_withdrawn || 0);
    setWithdrawConfirmOpen(false);
    setWithdrawStatusMsg("");
    setWithdrawSuccessData({
      amount,
      payoutId: data?.payout_id || "",
      stripePayoutUrl: data?.stripe_payout_url || "",
      payoutStatus: data?.payout_status || "pending",
      newBalance: Number(data?.new_balance || 0),
    });
    setWithdrawSuccessOpen(true);
    setRoyaltyBalance((prev) =>
      prev
        ? {
            ...prev,
            current_withdrawable_balance: Number(data?.new_balance || 0),
            total_withdrawn: Number(prev.total_withdrawn || 0) + amount,
            can_withdraw: false,
          }
        : prev
    );
    await Promise.all([loadRoyaltyBalance(), loadWithdrawalHistory()]);
  }

  function payoutStatusClass(status) {
    const value = (status || "").toLowerCase();
    if (value === "paid") {
      return "bg-success-subtle text-success";
    }
    if (value === "failed") {
      return "border-rose-500/40 bg-rose-500/15 text-rose-200";
    }
    return "border-amber-500/40 bg-amber-500/15 text-amber-200";
  }

  function toggleUserSort(key) {
    setUserSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
  }

  const filteredSortedUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    let rows = users.filter((u) => {
      if (!q) return true;
      return (
        (u.display_name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.parent_email || "").toLowerCase().includes(q)
      );
    });
    const { key, dir } = userSort;
    const mul = dir === "asc" ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      let va = a[key];
      let vb = b[key];
      if (key === "created_at") {
        va = new Date(va || 0).getTime();
        vb = new Date(vb || 0).getTime();
      } else if (key === "credit_balance") {
        va = Number(va) || 0;
        vb = Number(vb) || 0;
      } else if (typeof va === "number") {
        /* ok */
      } else {
        va = String(va || "").toLowerCase();
        vb = String(vb || "").toLowerCase();
      }
      if (va < vb) return -1 * mul;
      if (va > vb) return 1 * mul;
      return 0;
    });
    return rows;
  }, [users, userSearch, userSort]);

  const filteredCards = useMemo(() => {
    const q = cardSearch.trim().toLowerCase();
    return cards.filter((c) => {
      if (cardTierFilter !== "all") {
        const t = (c.tier || "").toLowerCase().replace(/-/g, "_");
        const want = cardTierFilter.toLowerCase();
        if (want === "all_star" && !["all_star", "allstar"].includes(t)) return false;
        if (want === "rookie" && t !== "rookie") return false;
        if (want === "legends" && t !== "legends") return false;
      }
      if (cardAnimatedOnly && !c.is_animated) return false;
      if (cardHighlightOnly && !c.is_highlight) return false;
      if (cardDeletedOnly && (c.status || "active") !== "deleted") return false;
      if (!q) return true;
      return (
        (c.player_name || "").toLowerCase().includes(q) ||
        (c.card_id || "").toLowerCase().includes(q)
      );
    });
  }, [cards, cardSearch, cardTierFilter, cardAnimatedOnly, cardHighlightOnly, cardDeletedOnly]);

  const filteredTrades = useMemo(() => {
    if (tradeStatusFilter === "all") return trades;
    return trades.filter((t) => (t.status || "").toLowerCase() === tradeStatusFilter);
  }, [trades, tradeStatusFilter]);

  const filteredMarketplaceOffers = useMemo(() => {
    if (marketplaceStatusFilter === "all") return marketplaceOffers;
    return marketplaceOffers.filter(
      (o) => (o.status || "").toLowerCase() === marketplaceStatusFilter
    );
  }, [marketplaceOffers, marketplaceStatusFilter]);

  function logoutAdmin() {
    localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    navigate("/login", { replace: true });
  }

  async function adminPermanentDeleteCard(cardId) {
    if (!cardId || !window.confirm(`Permanently delete ${cardId}? This cannot be undone.`)) return;
    setAdminDeleteBusyId(cardId);
    try {
      const res = await adminFetch(`/admin/cards/${encodeURIComponent(cardId)}/delete-permanently`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(formatApiError(data?.detail, "Permanent delete failed."));
      }
      setCards((prev) => prev.filter((c) => c.card_id !== cardId));
    } catch (e) {
      setErrors((prev) => ({ ...prev, cards: e.message || "Permanent delete failed." }));
    } finally {
      setAdminDeleteBusyId("");
    }
  }

  const kpi = (label, value, sub) => (
    <div className="rounded-xl border border-white/10 bg-cardBg2 p-4 shadow-inner shadow-black/20">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );

  const paginationControls = (offset, total, pageSize, setOffset, loadingKey) => {
    const page = Math.floor(offset / pageSize) + 1;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const atStart = offset <= 0;
    const atEnd = offset + pageSize >= total;
    return (
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
        <p>
          {total === 0 ? "No entries" : `${total} total · Page ${page} of ${totalPages}`}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={atStart || loading[loadingKey]}
            onClick={() => setOffset(Math.max(0, offset - pageSize))}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-slate-200 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={atEnd || loading[loadingKey]}
            onClick={() => setOffset(offset + pageSize)}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-slate-200 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  const fin = stats?.financial_summary;
  const withdrawableBalance = Number(royaltyBalance?.current_withdrawable_balance || 0);
  const belowMinimumWithdrawal =
    withdrawableBalance > 0 && withdrawableBalance < MIN_ROYALTY_WITHDRAWAL_DOLLARS;
  const minimumWithdrawalMessage = `Minimum withdrawal is $1.00. Your current balance is ${formatMoney(
    withdrawableBalance
  )}. Keep selling cards and come back when you have more to withdraw!`;

  const parsedWithdrawAmount = useMemo(() => {
    const raw = withdrawAmount.trim();
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [withdrawAmount]);

  const withdrawButtonLabel = useMemo(() => {
    if (withdrawBusy) return "Processing...";
    const amount = parsedWithdrawAmount;
    if (amount == null || amount <= 0) return "Withdraw to Bank";
    if (amount > withdrawableBalance) return "Insufficient Balance";
    if (amount < MIN_ROYALTY_WITHDRAWAL_DOLLARS) return "Minimum withdrawal is $1.00";
    return `Withdraw ${formatMoney(amount)} to Bank`;
  }, [withdrawBusy, parsedWithdrawAmount, withdrawableBalance]);

  const withdrawButtonEnabled = useMemo(() => {
    if (withdrawBusy || withdrawableBalance <= 0) return false;
    const amount = parsedWithdrawAmount;
    if (amount == null || amount <= 0) return false;
    if (amount > withdrawableBalance) return false;
    if (amount < MIN_ROYALTY_WITHDRAWAL_DOLLARS) return false;
    return true;
  }, [withdrawBusy, parsedWithdrawAmount, withdrawableBalance]);

  const confirmWithdrawAmount =
    parsedWithdrawAmount != null && parsedWithdrawAmount > 0
      ? parsedWithdrawAmount
      : withdrawableBalance;

  const confirmWithdrawLabel = useMemo(() => {
    if (withdrawBusy) return "Processing...";
    if (confirmWithdrawAmount > 0) {
      return `Confirm Withdrawal of ${formatMoney(confirmWithdrawAmount)}`;
    }
    return "Confirm Withdrawal";
  }, [withdrawBusy, confirmWithdrawAmount]);

  useEffect(() => {
    if (royaltyBalance?.current_withdrawable_balance == null) return;
    const balance = Number(royaltyBalance.current_withdrawable_balance) || 0;
    setWithdrawAmount(balance > 0 ? balance.toFixed(2) : "");
  }, [royaltyBalance?.current_withdrawable_balance]);

  const invitePanel = (
    <section className="mb-6 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-amber-100">Invite codes</h2>
          <p className="mt-1 text-xs text-slate-400">
            Current invite code:{" "}
            <span className="font-mono text-sm text-white">{inviteCode || "(none)"}</span>
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Beta mode:{" "}
            <span className={betaActive ? "text-brand-gold" : "text-slate-500"}>
              {betaActive ? "Active" : "Inactive"}
            </span>
            <span className="mt-1 block text-[11px] text-slate-500">
              In-memory override resets on server redeploy (see backend beta_config).
            </span>
          </p>
          {stats?.generation_stats ? (
            <div className="mt-4 rounded-lg border border-white/10 bg-cardBg2/80 px-3 py-2 text-xs text-slate-400">
              <p className="font-medium text-slate-300">Generation caps (read-only)</p>
              <p className="mt-1">
                Daily: {stats.generation_stats.daily_generation_cap} · Monthly:{" "}
                {stats.generation_stats.monthly_generation_cap}
              </p>
            </div>
          ) : null}
        </div>
        <form onSubmit={handleInviteUpdate} className="flex w-full max-w-md flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-400">New code</label>
            <input
              value={inviteDraft}
              onChange={(e) => setInviteDraft(e.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-lg border border-white/15 bg-cardBg px-3 py-2 text-sm text-slate-100"
              placeholder="Set invite code"
            />
          </div>
          <button
            type="submit"
            className="min-h-[44px] shrink-0 rounded-lg bg-amber-500/90 px-4 text-sm font-semibold text-slate-950 hover:bg-amber-400"
          >
            Update code
          </button>
        </form>
      </div>
      {inviteMsg ? (
        <p
          className={`mt-3 text-sm ${inviteMsg.includes("fail") || inviteMsg.includes("Failed") ? "text-rose-300" : "text-brand-gold"}`}
        >
          {inviteMsg}
        </p>
      ) : null}
    </section>
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-appBg text-slate-100">
      <header className="app-header backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <BrandLogo compact />
            <div>
              <h1 className="text-lg font-semibold text-white sm:text-xl admin-accent">Prospect Legends Admin</h1>
            </div>
          </div>
          <button type="button" onClick={logoutAdmin} className="btn-secondary px-4 py-2 text-sm font-medium">
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {invitePanel}

        <div className="mb-6 flex flex-wrap gap-2 border-b border-white/10 pb-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-t-lg px-4 py-2 text-sm font-medium transition ${
                tab === t.id
                  ? "border-b-2 border-[var(--color-gold-primary)] bg-[rgba(201,168,76,0.12)] text-[var(--color-text-gold)]"
                  : "text-slate-400 hover:bg-white/5 hover:text-[var(--color-text-gold)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" ? (
          <div className="space-y-8">
            {errors.overview ? (
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                {errors.overview}
              </p>
            ) : null}
            {loading.overview && !stats ? (
              <p className="text-sm text-slate-400">Loading overview…</p>
            ) : null}
            {stats ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {kpi("Total users", stats.total_users)}
                  {kpi("Total cards", stats.total_cards)}
                  {kpi("Total trades", stats.total_trades)}
                  {kpi("Trades pending", stats.trades_pending)}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {kpi("New users (7d)", stats.new_users_last_7_days)}
                  {kpi("New cards (7d)", stats.new_cards_last_7_days)}
                  {kpi("Trades accepted", stats.trades_accepted)}
                  {kpi("Trades declined", stats.trades_declined)}
                </div>
                {stats.generation_stats ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {kpi("Cards generated today", stats.generation_stats.cards_generated_today)}
                    {kpi("Cards generated this month", stats.generation_stats.cards_generated_this_month)}
                    {kpi("Daily generation cap", stats.generation_stats.daily_generation_cap)}
                    {kpi("Monthly generation cap", stats.generation_stats.monthly_generation_cap)}
                  </div>
                ) : null}
                {fin ? (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-success/90">Financial Overview</h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {kpi("Total Platform Volume", formatMoney(fin.total_volume))}
                      {kpi("Total Royalties Earned", formatMoney(fin.total_royalties))}
                      {kpi("Royalty Ledger Total", formatMoney(fin.royalties_ledger_total || 0))}
                      {kpi("Total Credits in Circulation", formatMoney(fin.total_credits_in_circulation))}
                      {kpi("Total Withdrawals", formatMoney(fin.total_withdrawals))}
                      {kpi("Stripe Connected Sellers", fin.stripe_connected_sellers ?? 0)}
                      {kpi("Average Sale Price", formatMoney(fin.average_sale_price))}
                      {kpi("Animation Revenue", formatMoney(fin.total_animation_revenue || 0))}
                      {kpi("Highlight Revenue", formatMoney(fin.total_highlight_revenue || 0))}
                    </div>
                    <div className="mt-3 rounded-lg border bg-gold-subtle px-3 py-2 text-xs text-brand-gold">
                      <p>
                        Stripe balance ({String(fin.stripe_balance_currency || "usd").toUpperCase()}):{" "}
                        <span className="font-semibold">{formatMoney(fin.stripe_balance_total || 0)}</span>{" "}
                        (available {formatMoney(fin.stripe_balance_available || 0)} + pending{" "}
                        {formatMoney(fin.stripe_balance_pending || 0)})
                      </p>
                      <p className="mt-1 text-brand-gold/80">
                        {fin.stripe_balance_ok
                          ? "Use this Stripe total alongside royalty metrics to spot retention discrepancies."
                          : `Stripe balance unavailable${fin?.stripe_error ? `: ${fin.stripe_error}` : " (check STRIPE_SECRET_KEY on backend)."}`}
                      </p>
                    </div>
                  </div>
                ) : null}
                {stats.marketplace_stats ? (
                  <>
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-brand-gold/90">Free Agency Marketplace</h3>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {kpi("Listed cards", stats.marketplace_stats.total_listed)}
                        {kpi("Total offers", stats.marketplace_stats.total_offers)}
                        {kpi("Offers pending", stats.marketplace_stats.offers_pending)}
                        {kpi("Offers accepted", stats.marketplace_stats.offers_accepted)}
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {kpi("Offers declined", stats.marketplace_stats.offers_declined ?? 0)}
                      {kpi("Offers expired", stats.marketplace_stats.offers_expired ?? 0)}
                      {kpi("Offers countered", stats.marketplace_stats.offers_countered ?? 0)}
                      {kpi("Counters accepted", stats.marketplace_stats.counters_accepted ?? 0)}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {kpi("Counters declined", stats.marketplace_stats.counters_declined ?? 0)}
                      {kpi(
                        "Sale volume",
                        "$" + Number(stats.marketplace_stats.total_volume || 0).toFixed(2)
                      )}
                      {kpi(
                        "Royalties earned",
                        "$" + Number(stats.marketplace_stats.total_royalties_earned || 0).toFixed(2)
                      )}
                    </div>
                  </>
                ) : null}
                {stats.animation_stats ? (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-violet-200/90">Animation</h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {kpi("Total animated cards", stats.animation_stats.total_animated ?? 0)}
                      {kpi("Animations pending", stats.animation_stats.animations_pending ?? 0)}
                      {kpi("Animations failed", stats.animation_stats.animations_failed ?? 0)}
                      {kpi(
                        "Most popular motion",
                        motionLabel(stats.animation_stats.most_popular_motion) || "—"
                      )}
                    </div>
                  </div>
                ) : null}
                {stats.highlight_stats ? (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-orange-200/90">Highlights</h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {kpi("Total highlight cards", stats.highlight_stats.total_highlight ?? 0)}
                      {kpi("Highlights pending", stats.highlight_stats.highlights_pending ?? 0)}
                      {kpi("Highlights failed", stats.highlight_stats.highlights_failed ?? 0)}
                    </div>
                  </div>
                ) : null}
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-slate-300">Cards by tier</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-orange-400/25 bg-orange-500/10 p-4">
                      <p className="text-xs uppercase text-orange-200/90">Rookie</p>
                      <p className="text-2xl font-semibold text-white">{stats.cards_by_tier?.rookie ?? 0}</p>
                    </div>
                    <div className="rounded-xl border bg-gold-subtle p-4">
                      <p className="text-xs uppercase text-brand-gold/90">All-Star</p>
                      <p className="text-2xl font-semibold text-white">{stats.cards_by_tier?.all_star ?? 0}</p>
                    </div>
                    <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-4">
                      <p className="text-xs uppercase text-amber-100/90">Legends</p>
                      <p className="text-2xl font-semibold text-white">{stats.cards_by_tier?.legends ?? 0}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-slate-300">Cards by rarity</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.cards_by_rarity || {}).length === 0 ? (
                      <p className="text-sm text-slate-500">No cards yet.</p>
                    ) : (
                      Object.entries(stats.cards_by_rarity).map(([k, v]) => (
                        <span
                          key={k}
                          className="rounded-full border border-white/10 bg-cardBg2 px-3 py-1 text-xs text-slate-300"
                        >
                          {k}: <strong className="text-white">{v}</strong>
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-cardBg p-4">
                    <h3 className="text-sm font-semibold text-white">Top creators</h3>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-[280px] text-left text-xs">
                        <thead>
                          <tr className="border-b border-white/10 text-slate-500">
                            <th className="py-2 pr-2">Name</th>
                            <th className="py-2 pr-2">Email</th>
                            <th className="py-2">Cards</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(stats.top_creators || []).length === 0 ? (
                            <tr>
                              <td colSpan={3} className="py-4 text-slate-500">
                                No data
                              </td>
                            </tr>
                          ) : (
                            stats.top_creators.map((r, i) => (
                              <tr key={`${r.email}-${i}`} className="border-b border-white/5">
                                <td className="py-2 pr-2 text-slate-200">{r.display_name}</td>
                                <td className="py-2 pr-2 text-slate-400">{r.email}</td>
                                <td className="py-2 text-white">{r.card_count}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-cardBg p-4">
                    <h3 className="text-sm font-semibold text-white">Recent users</h3>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-[260px] text-left text-xs">
                        <thead>
                          <tr className="border-b border-white/10 text-slate-500">
                            <th className="py-2 pr-2">Name</th>
                            <th className="py-2 pr-2">Email</th>
                            <th className="py-2">Joined</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(stats.recent_users || []).map((u) => (
                            <tr key={u.id} className="border-b border-white/5">
                              <td className="py-2 pr-2 text-slate-200">{u.display_name}</td>
                              <td className="py-2 pr-2 text-slate-400">{u.email}</td>
                              <td className="py-2 text-slate-400">{u.created_at?.slice(0, 10) || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-cardBg p-4 lg:col-span-1">
                    <h3 className="text-sm font-semibold text-white">Recent cards</h3>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-[320px] text-left text-xs">
                        <thead>
                          <tr className="border-b border-white/10 text-slate-500">
                            <th className="py-2 pr-2">Card</th>
                            <th className="py-2 pr-2">Player</th>
                            <th className="py-2 pr-2">Tier</th>
                            <th className="py-2 pr-2">Theme</th>
                            <th className="py-2 pr-2">Owner</th>
                            <th className="py-2">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(stats.recent_cards || []).map((c) => (
                            <tr key={c.card_id} className="border-b border-white/5">
                              <td className="py-2 pr-2 font-mono text-brand-gold/90">{c.card_id}</td>
                              <td className="py-2 pr-2 text-slate-200">{c.player_name}</td>
                              <td className="py-2 pr-2 text-slate-400">{c.tier}</td>
                              <td className="py-2 pr-2 text-slate-400">{c.theme}</td>
                              <td className="py-2 pr-2 text-slate-400">{c.owner_display_name}</td>
                              <td className="py-2 text-slate-500">{c.created_at?.slice(0, 10) || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        {tab === "users" ? (
          <div>
            {errors.users ? (
              <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                {errors.users}
              </p>
            ) : null}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <p className="text-sm text-slate-400">
                Total users: <span className="font-semibold text-white">{users.length}</span>
                {userSearch.trim() ? (
                  <>
                    {" "}
                    · Shown: <span className="font-semibold text-white">{filteredSortedUsers.length}</span>
                  </>
                ) : null}
              </p>
              <input
                placeholder="Search name or email…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="min-h-[42px] w-full max-w-xs rounded-lg border border-white/15 bg-cardBg2 px-3 py-2 text-sm"
              />
            </div>
            {loading.users ? <p className="text-sm text-slate-400">Loading users…</p> : null}
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-cardBg">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-white/10 bg-cardBg2 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    {[
                      ["display_name", "Display name"],
                      ["email", "Email"],
                      ["parent_email", "Parent Email"],
                      ["card_count", "Cards"],
                      ["monthly_generations", "Usage"],
                      ["trades_sent", "Trades sent"],
                      ["trades_received", "Trades received"],
                      ["credit_balance", "Credit Balance"],
                      ["created_at", "Member since"],
                    ].map(([key, label]) => (
                      <th key={key} className="p-3">
                        <button type="button" className="font-medium hover:text-brand-gold-bright" onClick={() => toggleUserSort(key)}>
                          {label}
                          {userSort.key === key ? (userSort.dir === "asc" ? " ↑" : " ↓") : ""}
                        </button>
                      </th>
                    ))}
                    <th className="p-3 font-medium">Stripe Connected</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSortedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-slate-500">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    filteredSortedUsers.map((u) => (
                      <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="p-3 text-slate-100">{u.display_name}</td>
                        <td className="p-3 text-slate-400">{u.email}</td>
                        <td className="p-3 text-slate-400">{u.parent_email || "—"}</td>
                        <td className="p-3 text-slate-300">{u.card_count}</td>
                        <td className="p-3 text-slate-300">{u.monthly_generations ?? 0}</td>
                        <td className="p-3 text-slate-300">{u.trades_sent}</td>
                        <td className="p-3 text-slate-300">{u.trades_received}</td>
                        <td className="p-3 tabular-nums text-slate-200">{formatMoney(u.credit_balance ?? 0)}</td>
                        <td className="p-3 text-slate-500">{u.created_at?.slice(0, 10) || "—"}</td>
                        <td className="p-3">
                          {u.stripe_payouts_enabled ? (
                            <span className="font-medium text-success">Yes</span>
                          ) : (
                            <span className="text-slate-500">No</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {tab === "cards" ? (
          <div>
            {errors.cards ? (
              <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                {errors.cards}
              </p>
            ) : null}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <p className="text-sm text-slate-400">
                Total cards: <span className="font-semibold text-white">{cards.length}</span>
                {cardSearch.trim() || cardTierFilter !== "all" || cardAnimatedOnly || cardHighlightOnly || cardDeletedOnly ? (
                  <>
                    {" "}
                    · Shown: <span className="font-semibold text-white">{filteredCards.length}</span>
                  </>
                ) : null}
              </p>
              <div className="flex flex-wrap gap-2">
                <select
                  value={cardTierFilter}
                  onChange={(e) => setCardTierFilter(e.target.value)}
                  className="min-h-[42px] rounded-lg border border-white/15 bg-cardBg2 px-3 text-sm"
                >
                  <option value="all">All tiers</option>
                  <option value="rookie">Rookie</option>
                  <option value="all_star">All-Star</option>
                  <option value="legends">Legends</option>
                </select>
                <label className="flex min-h-[42px] cursor-pointer items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 text-sm text-violet-100">
                  <input
                    type="checkbox"
                    checked={cardAnimatedOnly}
                    onChange={(e) => setCardAnimatedOnly(e.target.checked)}
                    className="rounded border-white/20"
                  />
                  Animated only
                </label>
                <label className="flex min-h-[42px] cursor-pointer items-center gap-2 rounded-lg border border-[#D85A30]/30 bg-[#D85A30]/10 px-3 text-sm text-orange-100">
                  <input
                    type="checkbox"
                    checked={cardHighlightOnly}
                    onChange={(e) => setCardHighlightOnly(e.target.checked)}
                    className="rounded border-white/20"
                  />
                  Highlight only
                </label>
                <label className="flex min-h-[42px] cursor-pointer items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 text-sm text-rose-100">
                  <input
                    type="checkbox"
                    checked={cardDeletedOnly}
                    onChange={(e) => setCardDeletedOnly(e.target.checked)}
                    className="rounded border-white/20"
                  />
                  Deleted only
                </label>
                <input
                  placeholder="Player or card ID…"
                  value={cardSearch}
                  onChange={(e) => setCardSearch(e.target.value)}
                  className="min-h-[42px] w-full min-w-[200px] flex-1 rounded-lg border border-white/15 bg-cardBg2 px-3 py-2 text-sm sm:max-w-xs"
                />
              </div>
            </div>
            {loading.cards ? <p className="text-sm text-slate-400">Loading cards…</p> : null}
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-cardBg">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="border-b border-white/10 bg-cardBg2 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    {["Card ID", "Player", "Team", "Tier", "Theme", "Rarity", "Ed.", "Print", "Animated", "Highlight", "Owner", "Status", "Created", "Actions"].map(
                      (h) => (
                        <th key={h} className="p-3 font-medium">
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredCards.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="p-6 text-center text-slate-500">
                        No cards match.
                      </td>
                    </tr>
                  ) : (
                    filteredCards.map((c) => (
                      <tr key={c.card_id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="p-3 font-mono text-xs text-brand-gold/90">{c.card_id}</td>
                        <td className="p-3 text-slate-100">{c.player_name}</td>
                        <td className="p-3 text-slate-400">{c.team_name}</td>
                        <td className="p-3 text-slate-400">{c.tier}</td>
                        <td className="p-3 text-slate-400">{c.theme}</td>
                        <td className="p-3 text-slate-400">{c.rarity}</td>
                        <td className="p-3 text-slate-400">{c.edition_number}</td>
                        <td className="p-3 text-slate-400">{c.print_run}</td>
                        <td className="p-3">
                          {c.is_animated ? (
                            <span className="rounded-full border border-violet-400/40 bg-violet-500/15 px-2 py-0.5 text-[11px] font-medium text-violet-100">
                              Yes
                            </span>
                          ) : (
                            <span className="text-slate-500">No</span>
                          )}
                        </td>
                        <td className="p-3">
                          {c.is_highlight ? (
                            <span className="rounded-full border border-[#D85A30]/40 bg-[#D85A30]/15 px-2 py-0.5 text-[11px] font-medium text-orange-100">
                              Yes
                            </span>
                          ) : (
                            <span className="text-slate-500">No</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-300">
                          <span className="block">{c.owner_display_name}</span>
                          <span className="text-xs text-slate-500">{c.owner_email}</span>
                        </td>
                        <td className="p-3 text-slate-400">
                          {(c.status || "active") === "deleted" ? (
                            <div className="space-y-1">
                              <span className="inline-flex rounded-full border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase text-rose-100">
                                Deleted
                              </span>
                              {c.deleted_at ? (
                                <span className="block text-[11px] text-slate-500">
                                  {c.deleted_at.slice(0, 10)}
                                  {typeof c.days_remaining === "number"
                                    ? ` · ${c.days_remaining}d left`
                                    : ""}
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            c.status
                          )}
                        </td>
                        <td className="p-3 text-slate-500">{c.created_at?.slice(0, 10) || "—"}</td>
                        <td className="p-3">
                          {(c.status || "active") === "deleted" ? (
                            <button
                              type="button"
                              disabled={adminDeleteBusyId === c.card_id}
                              onClick={() => adminPermanentDeleteCard(c.card_id)}
                              className="rounded-lg border border-rose-500/40 px-2 py-1 text-[11px] font-medium text-rose-200 hover:bg-rose-500/10 disabled:opacity-50"
                            >
                              {adminDeleteBusyId === c.card_id ? "…" : "Delete forever"}
                            </button>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {tab === "trades" ? (
          <div>
            {errors.trades ? (
              <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                {errors.trades}
              </p>
            ) : null}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <p className="text-sm text-slate-400">
                Total trades: <span className="font-semibold text-white">{trades.length}</span>
                {tradeStatusFilter !== "all" ? (
                  <>
                    {" "}
                    · Shown: <span className="font-semibold text-white">{filteredTrades.length}</span>
                  </>
                ) : null}
              </p>
              <select
                value={tradeStatusFilter}
                onChange={(e) => setTradeStatusFilter(e.target.value)}
                className="min-h-[42px] w-full max-w-xs rounded-lg border border-white/15 bg-cardBg2 px-3 text-sm"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            {loading.trades ? <p className="text-sm text-slate-400">Loading trades…</p> : null}
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-cardBg">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-white/10 bg-cardBg2 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    {["Trade ID", "Card", "Sender", "Recipient", "Status", "Message", "Sent", "Updated"].map((h) => (
                      <th key={h} className="p-3 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTrades.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-500">
                        No trades match.
                      </td>
                    </tr>
                  ) : (
                    filteredTrades.map((t) => (
                      <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="p-3 text-slate-200">{t.id}</td>
                        <td className="p-3">
                          <span className="font-mono text-xs text-brand-gold/90">{t.card_id}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">{t.player_name}</span>
                        </td>
                        <td className="p-3 text-slate-300">
                          <span className="block">{t.sender_display_name}</span>
                          <span className="text-xs text-slate-500">{t.sender_email}</span>
                        </td>
                        <td className="p-3 text-slate-300">
                          <span className="block">{t.recipient_display_name}</span>
                          <span className="text-xs text-slate-500">{t.recipient_email}</span>
                        </td>
                        <td className="p-3 text-slate-400">{t.status}</td>
                        <td className="max-w-[200px] truncate p-3 text-xs text-slate-500" title={t.message}>
                          {t.message || "—"}
                        </td>
                        <td className="p-3 text-xs text-slate-500">{t.created_at?.slice(0, 16) || "—"}</td>
                        <td className="p-3 text-xs text-slate-500">{t.updated_at?.slice(0, 16) || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {tab === "marketplace" ? (
          <div>
            {errors.marketplace ? (
              <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                {errors.marketplace}
              </p>
            ) : null}
            <p className="mb-4 text-sm text-slate-400">
              Marketplace offers: <span className="font-semibold text-white">{marketplaceOffers.length}</span>
              {marketplaceStatusFilter !== "all" ? (
                <>
                  {" "}
                  · Shown: <span className="font-semibold text-white">{filteredMarketplaceOffers.length}</span>
                </>
              ) : null}
            </p>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <label className="text-xs uppercase tracking-wide text-slate-500">Status</label>
              <select
                value={marketplaceStatusFilter}
                onChange={(e) => setMarketplaceStatusFilter(e.target.value)}
                className="rounded-lg border border-white/15 bg-cardBg px-3 py-2 text-sm text-slate-100"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            {loading.marketplace ? <p className="text-sm text-slate-400">Loading marketplace…</p> : null}
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-cardBg">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="border-b border-white/10 bg-cardBg2 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    {["Offer ID", "Card", "Player", "Buyer", "Seller", "Amount", "Royalty", "Counter", "Status", "Created"].map((h) => (
                      <th key={h} className="p-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {marketplaceOffers.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-slate-500">No marketplace offers yet.</td>
                    </tr>
                  ) : filteredMarketplaceOffers.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-slate-500">
                        No offers match this status filter.
                      </td>
                    </tr>
                  ) : (
                    filteredMarketplaceOffers.map((o) => (
                      <tr key={o.offer_id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="p-3 text-slate-200">{o.offer_id}</td>
                        <td className="p-3 font-mono text-xs text-brand-gold/90">{o.card_id}</td>
                        <td className="p-3 text-slate-300">{o.player_name}</td>
                        <td className="p-3 text-slate-300">
                          <span className="block">{o.buyer_display_name}</span>
                          <span className="text-xs text-slate-500">{o.buyer_email}</span>
                        </td>
                        <td className="p-3 text-slate-300">
                          <span className="block">{o.seller_display_name}</span>
                          <span className="text-xs text-slate-500">{o.seller_email}</span>
                        </td>
                        <td className="p-3 text-slate-200">${Number(o.offer_amount || 0).toFixed(2)}</td>
                        <td className="p-3 text-slate-400">${Number(o.royalty_amount || 0).toFixed(2)}</td>
                        <td className="p-3 text-slate-300">
                          {o.counter_amount != null ? `$${Number(o.counter_amount).toFixed(2)}` : "—"}
                        </td>
                        <td className="p-3 text-slate-400">{o.status}</td>
                        <td className="p-3 text-xs text-slate-500">{o.created_at?.slice(0, 16) || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {tab === "earnings" ? (
          <div className="space-y-8">
            {errors.earningsSummary ? (
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                {errors.earningsSummary}
              </p>
            ) : null}
            {withdrawStatusMsg ? (
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                {withdrawStatusMsg}
              </p>
            ) : null}

            <section>
              <h2 className="mb-4 text-lg font-semibold text-white">Platform Earnings</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-amber-100/90">Total Earned (All Time)</p>
                  <p className="mt-1 text-2xl font-semibold text-white">
                    {formatMoney(royaltyBalance?.total_royalties_earned || 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-amber-100/90">Available to Withdraw</p>
                  <p className="mt-1 text-2xl font-semibold text-white">
                    {formatMoney(royaltyBalance?.current_withdrawable_balance || 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-amber-100/90">Total Withdrawn (All Time)</p>
                  <p className="mt-1 text-2xl font-semibold text-white">
                    {formatMoney(royaltyBalance?.total_withdrawn || 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-amber-100/90">This Month</p>
                  <p className="mt-1 text-2xl font-semibold text-white">
                    {formatMoney(royaltyBalance?.this_month || 0)}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-cardBg p-4">
              <h3 className="text-sm font-semibold text-white">Withdraw</h3>
              <p className="mt-1 text-sm text-slate-400">
                Available to withdraw:{" "}
                <span className="font-semibold text-success">{formatMoney(withdrawableBalance)}</span>
              </p>
              <div className="mt-4">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Withdrawal amount
                </label>
                <div className="relative mt-1 max-w-xs">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={withdrawableBalance > 0 ? withdrawableBalance : undefined}
                    step="0.01"
                    disabled={withdrawBusy || withdrawableBalance <= 0}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                    className="min-h-[44px] w-full rounded-lg border border-white/15 bg-cardBg2 py-2 pl-7 pr-3 text-slate-100"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">Minimum $1.00</p>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={!withdrawButtonEnabled}
                  onClick={() => setWithdrawConfirmOpen(true)}
                  className="min-h-[48px] rounded-lg btn-primary px-5 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {withdrawButtonLabel}
                </button>
                <p className="text-sm text-slate-300">
                  {withdrawButtonEnabled
                    ? `Withdraw ${formatMoney(parsedWithdrawAmount)} to your connected bank account`
                    : belowMinimumWithdrawal
                      ? minimumWithdrawalMessage
                      : withdrawableBalance <= 0
                        ? "No balance available to withdraw"
                        : parsedWithdrawAmount != null &&
                            parsedWithdrawAmount > withdrawableBalance
                          ? "Amount exceeds your available balance."
                          : parsedWithdrawAmount != null &&
                              parsedWithdrawAmount > 0 &&
                              parsedWithdrawAmount < MIN_ROYALTY_WITHDRAWAL_DOLLARS
                            ? "Minimum withdrawal is $1.00."
                            : "Enter a withdrawal amount to continue."}
                </p>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Payouts are sent from your platform Stripe balance to the bank account configured in
                Stripe Settings → Bank accounts and scheduling.
              </p>
            </section>

            <section className="rounded-xl border border-white/10 bg-cardBg p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-white">Earnings by Transaction</h3>
                <button
                  type="button"
                  onClick={handleExportEarningsCsv}
                  className="rounded-lg border border-white/20 px-3 py-2 text-xs font-medium text-slate-200 hover:border-white/40"
                >
                  Export CSV
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  value={earningsDateRange}
                  onChange={(e) => {
                    setEarningsDateRange(e.target.value);
                    setEarningsOffset(0);
                  }}
                  className="min-h-[40px] rounded-lg border border-white/15 bg-cardBg2 px-3 text-sm"
                >
                  {EARNINGS_DATE_RANGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <select
                  value={earningsSort}
                  onChange={(e) => {
                    setEarningsSort(e.target.value);
                    setEarningsOffset(0);
                  }}
                  className="min-h-[40px] rounded-lg border border-white/15 bg-cardBg2 px-3 text-sm"
                >
                  <option value="desc">Newest first</option>
                  <option value="asc">Oldest first</option>
                </select>
                <input
                  value={earningsSearch}
                  onChange={(e) => {
                    setEarningsSearch(e.target.value);
                    setEarningsOffset(0);
                  }}
                  placeholder="Search seller, buyer, card..."
                  className="min-h-[40px] w-full min-w-[220px] flex-1 rounded-lg border border-white/15 bg-cardBg2 px-3 text-sm"
                />
              </div>
              <p className="mt-3 text-sm text-slate-400">
                {earningsTotalCount} rows · Filter total:{" "}
                <span className="font-semibold text-success">{formatMoney(earningsFilteredTotal)}</span>
              </p>
              {errors.earningsTable ? (
                <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                  {errors.earningsTable}
                </p>
              ) : null}
              <div className="mt-3 overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full min-w-[1200px] text-left text-sm">
                  <thead className="border-b border-white/10 bg-cardBg2 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      {[
                        "Date",
                        "Card Sold",
                        "Sold By",
                        "Bought By",
                        "Sale Price",
                        "Our Cut",
                        "Running Total",
                      ].map((h) => (
                        <th key={h} className="p-3 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {earningsEntries.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-500">
                          No earnings rows found for this filter.
                        </td>
                      </tr>
                    ) : (
                      earningsEntries.map((row, idx) => (
                        <tr
                          key={row.offer_id}
                          className={`${idx % 2 ? "bg-white/[0.015]" : ""} border-b border-white/5`}
                        >
                          <td className="p-3 text-xs text-slate-400">{formatDateTime(row.date)}</td>
                          <td className="p-3">
                            <p className="text-slate-200">{row.player_name || "—"}</p>
                            <p className="font-mono text-xs text-brand-gold/90">{row.card_id}</p>
                            <span
                              className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[11px] ${tierBadgeClass(row.tier)}`}
                            >
                              {row.tier || "—"}
                            </span>
                          </td>
                          <td className="p-3 text-slate-300">{row.seller_display_name || "—"}</td>
                          <td className="p-3 text-slate-300">{row.buyer_display_name || "—"}</td>
                          <td className="p-3 tabular-nums text-slate-200">{formatMoney(row.sale_amount || 0)}</td>
                          <td className="p-3 tabular-nums font-semibold text-success">
                            {formatMoney(row.royalty_amount || 0)}
                          </td>
                          <td className="p-3 tabular-nums text-amber-200">{formatMoney(row.running_total || 0)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {paginationControls(
                earningsOffset,
                earningsTotalCount,
                EARNINGS_PAGE_SIZE,
                setEarningsOffset,
                "earningsTable"
              )}
            </section>

            <section className="rounded-xl border border-white/10 bg-cardBg p-4">
              <h3 className="text-sm font-semibold text-white">Withdrawal History</h3>
              <p className="mt-2 text-sm text-slate-400">
                {withdrawalHistoryTotal} entries
              </p>
              {errors.earningsWithdrawals ? (
                <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                  {errors.earningsWithdrawals}
                </p>
              ) : null}
              <div className="mt-3 overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="border-b border-white/10 bg-cardBg2 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      {[
                        "Date",
                        "Amount",
                        "Stripe Payout ID",
                        "Status",
                        "Running Total Withdrawn",
                      ].map((h) => (
                        <th key={h} className="p-3 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawalHistoryEntries.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-500">
                          No withdrawals yet.
                        </td>
                      </tr>
                    ) : (
                      withdrawalHistoryEntries.slice(0, 100).map((row) => (
                        <tr key={row.id} className="border-b border-white/5">
                          <td className="p-3 text-xs text-slate-400">{formatDateTime(row.created_at)}</td>
                          <td className="p-3 tabular-nums text-slate-100">{formatMoney(row.amount || 0)}</td>
                          <td className="p-3">
                            {row.payout_id || row.reference_id ? (
                              <div className="space-y-1">
                                <p className="font-mono text-xs text-slate-300">
                                  {row.payout_id || row.reference_id}
                                </p>
                                {row.stripe_payout_url ? (
                                  <a
                                    href={row.stripe_payout_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-medium text-brand-gold hover:underline"
                                  >
                                    View in Stripe →
                                  </a>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[11px] capitalize ${payoutStatusClass(
                                row.status
                              )}`}
                            >
                              {row.status || "pending"}
                            </span>
                          </td>
                          <td className="p-3 tabular-nums text-slate-300">
                            {formatMoney(row.running_total_withdrawn || 0)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-cardBg p-4">
              <h3 className="text-sm font-semibold text-white">Monthly Earnings (Last 12 Months)</h3>
              <p className="mt-1 text-sm text-slate-400">
                Year total: <span className="font-semibold text-success">{formatMoney(monthlyEarningsYearTotal)}</span>
              </p>
              {errors.earningsChart ? (
                <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                  {errors.earningsChart}
                </p>
              ) : null}
              <div className="mt-3 h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyEarningsPoints}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                    <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis
                      stroke="#94a3b8"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `$${Number(v || 0).toFixed(0)}`}
                    />
                    <Tooltip
                      formatter={(value) => [formatMoney(Number(value || 0)), "Earnings"]}
                      labelStyle={{ color: "#0f172a" }}
                    />
                    <Bar dataKey="total" fill="#34d399" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        ) : null}

        {tab === "financials" ? (
          <div className="space-y-10">
            <section>
              <h2 className="text-lg font-semibold text-white">Ledger Feed</h2>
              {errors.financialsLedger ? (
                <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                  {errors.financialsLedger}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="text-xs uppercase tracking-wide text-slate-500">Type</label>
                <select
                  value={ledgerTypeFilter}
                  onChange={(e) => {
                    setLedgerTypeFilter(e.target.value);
                    setLedgerOffset(0);
                  }}
                  className="min-h-[42px] rounded-lg border border-white/15 bg-cardBg2 px-3 text-sm"
                >
                  {LEDGER_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-slate-400">
                  {ledgerTotal} {ledgerTotal === 1 ? "entry" : "entries"}
                </p>
              </div>
              {loading.financialsLedger ? (
                <p className="mt-4 text-sm text-slate-400">Loading ledger…</p>
              ) : null}
              <div className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-cardBg">
                <table className="w-full min-w-[960px] text-left text-sm">
                  <thead className="border-b border-white/10 bg-cardBg2 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      {["User", "Type", "Amount", "Balance After", "Note", "Reference ID", "Date"].map((h) => (
                        <th key={h} className="p-3 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerEntries.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-500">
                          No ledger entries found.
                        </td>
                      </tr>
                    ) : (
                      ledgerEntries.map((row) => {
                        const amt = Number(row.amount);
                        const positive = amt >= 0;
                        return (
                          <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                            <td className="p-3 text-slate-200">{row.display_name}</td>
                            <td className="p-3">
                              <span
                                className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${txBadgeClass(row.transaction_type)}`}
                              >
                                {formatLedgerType(row.transaction_type)}
                              </span>
                            </td>
                            <td
                              className={`p-3 tabular-nums font-semibold ${positive ? "text-success" : "text-rose-300"}`}
                            >
                              {positive ? "+" : ""}
                              {formatMoney(amt)}
                            </td>
                            <td className="p-3 tabular-nums text-slate-300">{formatMoney(row.balance_after)}</td>
                            <td className="max-w-[200px] truncate p-3 text-xs text-slate-500" title={row.note}>
                              {row.note || "—"}
                            </td>
                            <td className="p-3 font-mono text-xs text-slate-500">{row.reference_id || "—"}</td>
                            <td className="p-3 text-xs text-slate-500">{row.created_at?.slice(0, 16) || "—"}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {paginationControls(ledgerOffset, ledgerTotal, LEDGER_PAGE_SIZE, setLedgerOffset, "financialsLedger")}
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">Royalties</h2>
              <p className="mt-3 text-2xl font-bold tabular-nums text-brand-gold">
                Total Royalties Earned: {formatMoney(royaltiesSum)}
              </p>
              {fin ? (
                <div className="mt-3 rounded-lg border border-white/10 bg-cardBg2 px-3 py-3 text-xs text-slate-300">
                  <p>
                    Royalties (accepted offers): <span className="font-semibold text-white">{formatMoney(fin.total_royalties || 0)}</span>
                  </p>
                  <p className="mt-1">
                    Royalties (credit ledger): <span className="font-semibold text-white">{formatMoney(fin.royalties_ledger_total || 0)}</span>
                  </p>
                  <p className="mt-1">
                    Platform Stripe balance: <span className="font-semibold text-white">{formatMoney(fin.stripe_balance_total || 0)}</span>
                    {` `}({String(fin.stripe_balance_currency || "usd").toUpperCase()})
                  </p>
                </div>
              ) : null}
              {errors.financialsRoyalties ? (
                <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                  {errors.financialsRoyalties}
                </p>
              ) : null}
              {loading.financialsRoyalties ? (
                <p className="mt-4 text-sm text-slate-400">Loading royalties…</p>
              ) : null}
              <div className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-cardBg">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="border-b border-white/10 bg-cardBg2 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      {["Card", "Seller", "Buyer", "Sale Amount", `Royalty Earned (${platformRoyaltyPercentLabel()})`, "Date"].map((h) => (
                        <th key={h} className="p-3 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {royaltiesEntries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-500">
                          No royalty records found.
                        </td>
                      </tr>
                    ) : (
                      royaltiesEntries.map((row) => (
                        <tr key={row.offer_id} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="p-3">
                            <span className="block text-slate-200">{row.player_name}</span>
                            <span className="font-mono text-xs text-brand-gold/90">{row.card_id}</span>
                          </td>
                          <td className="p-3 text-slate-300">{row.seller_display_name}</td>
                          <td className="p-3 text-slate-300">{row.buyer_display_name}</td>
                          <td className="p-3 tabular-nums text-slate-200">{formatMoney(row.sale_amount)}</td>
                          <td className="p-3 tabular-nums text-amber-200">{formatMoney(row.royalty_amount)}</td>
                          <td className="p-3 text-xs text-slate-500">{row.date?.slice(0, 16) || "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {paginationControls(
                royaltiesOffset,
                royaltiesTotal,
                LEDGER_PAGE_SIZE,
                setRoyaltiesOffset,
                "financialsRoyalties"
              )}
            </section>
          </div>
        ) : null}

        {withdrawConfirmOpen ? (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md rounded-xl border border-white/15 bg-cardBg p-5">
              <h3 className="text-lg font-semibold text-white">Withdraw to Bank</h3>
              <p className="mt-2 text-sm text-slate-300">
                You are about to withdraw{" "}
                <span className="font-semibold text-success">
                  {formatMoney(confirmWithdrawAmount)}
                </span>{" "}
                to your connected bank account.
              </p>
              <p className="mt-2 text-sm text-slate-400">
                This will appear in Stripe as a payout and arrive in your bank account within 2
                business days.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Stripe payout ID will be saved for your records.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setWithdrawConfirmOpen(false)}
                  className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-200 hover:border-white/35"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleWithdrawConfirm}
                  disabled={withdrawBusy || !withdrawButtonEnabled}
                  className="rounded-lg btn-primary px-4 py-2 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-50"
                >
                  {confirmWithdrawLabel}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {withdrawSuccessOpen && withdrawSuccessData ? (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md rounded-xl border border-[var(--color-success)]/30 bg-cardBg p-5">
              <h3 className="text-lg font-semibold text-white">
                Withdrawal of {formatMoney(withdrawSuccessData.amount)} initiated!
              </h3>
              <p className="mt-2 text-sm text-slate-300">
                Stripe Payout ID:{" "}
                <span className="font-mono text-success">{withdrawSuccessData.payoutId || "—"}</span>
                {" — "}use this to track in your Stripe dashboard under Payouts.
              </p>
              {withdrawSuccessData.stripePayoutUrl ? (
                <a
                  href={withdrawSuccessData.stripePayoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm font-medium text-brand-gold hover:underline"
                >
                  View in Stripe →
                </a>
              ) : null}
              <p className="mt-3 text-sm text-slate-400">Funds arrive in approximately 2 business days.</p>
              <p className="mt-2 text-sm text-slate-300">
                Available balance is now {formatMoney(withdrawSuccessData.newBalance)}.
              </p>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setWithdrawSuccessOpen(false)}
                  className="rounded-lg btn-primary px-4 py-2 text-sm font-semibold text-slate-950 hover:brightness-110"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
      <AppFooter />
    </div>
  );
}
