import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppFooter from "../components/AppFooter";
import { ADMIN_TOKEN_STORAGE_KEY, API_BASE_URL, adminHeaders } from "../config/api";
import { motionLabel } from "../constants/animationMotions";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Users" },
  { id: "cards", label: "Cards" },
  { id: "trades", label: "Trades" },
  { id: "marketplace", label: "Marketplace" },
];

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

  const [loading, setLoading] = useState({
    overview: true,
    users: true,
    cards: true,
    trades: true,
    marketplace: true,
  });
  const [errors, setErrors] = useState({});

  const [userSort, setUserSort] = useState({ key: "display_name", dir: "asc" });
  const [userSearch, setUserSearch] = useState("");

  const [cardTierFilter, setCardTierFilter] = useState("all");
  const [cardAnimatedOnly, setCardAnimatedOnly] = useState(false);
  const [cardSearch, setCardSearch] = useState("");

  const [tradeStatusFilter, setTradeStatusFilter] = useState("all");
  const [marketplaceStatusFilter, setMarketplaceStatusFilter] = useState("all");

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

  useEffect(() => {
    loadInvite();
    loadStats();
    loadUsers();
    loadCards();
    loadTrades();
    loadMarketplace();
  }, [loadInvite, loadStats, loadUsers, loadCards, loadTrades, loadMarketplace]);

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
        (u.email || "").toLowerCase().includes(q)
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
      if (!q) return true;
      return (
        (c.player_name || "").toLowerCase().includes(q) ||
        (c.card_id || "").toLowerCase().includes(q)
      );
    });
  }, [cards, cardSearch, cardTierFilter, cardAnimatedOnly]);

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

  const kpi = (label, value, sub) => (
    <div className="rounded-xl border border-white/10 bg-cardBg2 p-4 shadow-inner shadow-black/20">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );

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
            <span className={betaActive ? "text-neonTeal" : "text-slate-500"}>
              {betaActive ? "Active" : "Inactive"}
            </span>
            <span className="mt-1 block text-[11px] text-slate-500">
              In-memory override resets on server redeploy (see backend beta_config).
            </span>
          </p>
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
          className={`mt-3 text-sm ${inviteMsg.includes("fail") || inviteMsg.includes("Failed") ? "text-rose-300" : "text-neonTeal"}`}
        >
          {inviteMsg}
        </p>
      ) : null}
    </section>
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-appBg text-slate-100">
      <header className="border-b border-white/10 bg-cardBg/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-slate-500">Future Legends</p>
            <h1 className="text-lg font-semibold text-white sm:text-xl">Future Legends Admin</h1>
          </div>
          <button
            type="button"
            onClick={logoutAdmin}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 hover:border-white/30 hover:text-white"
          >
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
                  ? "bg-neonBlue/20 text-neonBlue"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
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
                {stats.marketplace_stats ? (
                  <>
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-teal-200/90">Free Agency Marketplace</h3>
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
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-slate-300">Cards by tier</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-orange-400/25 bg-orange-500/10 p-4">
                      <p className="text-xs uppercase text-orange-200/90">Rookie</p>
                      <p className="text-2xl font-semibold text-white">{stats.cards_by_tier?.rookie ?? 0}</p>
                    </div>
                    <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 p-4">
                      <p className="text-xs uppercase text-cyan-100/90">All-Star</p>
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
                              <td className="py-2 pr-2 font-mono text-neonTeal/90">{c.card_id}</td>
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
                      ["card_count", "Cards"],
                      ["trades_sent", "Trades sent"],
                      ["trades_received", "Trades received"],
                      ["created_at", "Member since"],
                    ].map(([key, label]) => (
                      <th key={key} className="p-3">
                        <button type="button" className="font-medium hover:text-neonBlue" onClick={() => toggleUserSort(key)}>
                          {label}
                          {userSort.key === key ? (userSort.dir === "asc" ? " ↑" : " ↓") : ""}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSortedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-500">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    filteredSortedUsers.map((u) => (
                      <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="p-3 text-slate-100">{u.display_name}</td>
                        <td className="p-3 text-slate-400">{u.email}</td>
                        <td className="p-3 text-slate-300">{u.card_count}</td>
                        <td className="p-3 text-slate-300">{u.trades_sent}</td>
                        <td className="p-3 text-slate-300">{u.trades_received}</td>
                        <td className="p-3 text-slate-500">{u.created_at?.slice(0, 10) || "—"}</td>
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
                {cardSearch.trim() || cardTierFilter !== "all" || cardAnimatedOnly ? (
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
                    {["Card ID", "Player", "Team", "Tier", "Theme", "Rarity", "Ed.", "Print", "Animated", "Owner", "Status", "Created"].map(
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
                      <td colSpan={12} className="p-6 text-center text-slate-500">
                        No cards match.
                      </td>
                    </tr>
                  ) : (
                    filteredCards.map((c) => (
                      <tr key={c.card_id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="p-3 font-mono text-xs text-neonTeal/90">{c.card_id}</td>
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
                        <td className="p-3 text-slate-300">
                          <span className="block">{c.owner_display_name}</span>
                          <span className="text-xs text-slate-500">{c.owner_email}</span>
                        </td>
                        <td className="p-3 text-slate-400">{c.status}</td>
                        <td className="p-3 text-slate-500">{c.created_at?.slice(0, 10) || "—"}</td>
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
                          <span className="font-mono text-xs text-neonTeal/90">{t.card_id}</span>
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
                        <td className="p-3 font-mono text-xs text-neonTeal/90">{o.card_id}</td>
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
      </main>
      <AppFooter />
    </div>
  );
}
