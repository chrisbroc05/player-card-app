import React, { useCallback, useEffect, useMemo, useState } from "react";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import MarketplaceSubNav from "../components/MarketplaceSubNav";
import MarketplaceCardGridItem from "../components/MarketplaceCardGridItem";
import MarketplaceGridSkeleton from "../components/MarketplaceGridSkeleton";
import { API_BASE_URL } from "../config/api";
import { normalizeTierKey } from "../utils/marketplace";

const TIER_OPTIONS = [
  { value: "", label: "All tiers" },
  { value: "rookie", label: "Rookie" },
  { value: "all_star", label: "All-Star" },
  { value: "legends", label: "Legends" },
];

const SORT_OPTIONS = [
  { value: "listed_at-desc", label: "Newest listed" },
  { value: "listed_at-asc", label: "Oldest listed" },
  { value: "asking_price-asc", label: "Price: low to high" },
  { value: "asking_price-desc", label: "Price: high to low" },
  { value: "player_name-asc", label: "Player A–Z" },
  { value: "player_name-desc", label: "Player Z–A" },
];

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function MarketplacePage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [sort, setSort] = useState("listed_at-desc");

  const debouncedSearch = useDebouncedValue(search, 300);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/marketplace/listings`);
      if (!res.ok) throw new Error("Could not load listings.");
      const data = await res.json();
      setListings(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Failed to load marketplace.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const gradYears = useMemo(() => {
    const years = new Set();
    for (const row of listings) {
      const y = Number(row.grad_year);
      if (y > 0) years.add(y);
    }
    return [...years].sort((a, b) => b - a);
  }, [listings]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const wantTier = tier ? normalizeTierKey(tier) : "";
    const wantYear = gradYear ? Number(gradYear) : null;
    const [sortBy, sortOrder] = sort.split("-");

    let rows = listings.filter((row) => {
      if (wantTier && normalizeTierKey(row.tier) !== wantTier) return false;
      if (wantYear && Number(row.grad_year) !== wantYear) return false;
      if (!q) return true;
      const hay = `${row.player_name || ""} ${row.team_name || ""} ${row.card_id || ""}`.toLowerCase();
      return hay.includes(q);
    });

    const desc = sortOrder !== "asc";
    rows = [...rows].sort((a, b) => {
      let va;
      let vb;
      if (sortBy === "asking_price") {
        va = Number(a.asking_price) || 0;
        vb = Number(b.asking_price) || 0;
      } else if (sortBy === "player_name") {
        va = (a.player_name || "").toLowerCase();
        vb = (b.player_name || "").toLowerCase();
      } else {
        va = new Date(a.listed_at || 0).getTime();
        vb = new Date(b.listed_at || 0).getTime();
      }
      if (va < vb) return desc ? 1 : -1;
      if (va > vb) return desc ? -1 : 1;
      return 0;
    });
    return rows;
  }, [listings, debouncedSearch, tier, gradYear, sort]);

  return (
    <MarketplaceBrowseLayout
      error={error}
      loading={loading}
      filtered={filtered}
      search={search}
      setSearch={setSearch}
      tier={tier}
      setTier={setTier}
      gradYears={gradYears}
      gradYear={gradYear}
      setGradYear={setGradYear}
      sort={sort}
      setSort={setSort}
    />
  );
}

function MarketplaceBrowseLayout({
  error,
  loading,
  filtered,
  search,
  setSearch,
  tier,
  setTier,
  gradYears,
  gradYear,
  setGradYear,
  sort,
  setSort,
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-appBg text-slate-100">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl px-3 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 text-center sm:text-left">
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-teal-500/80">Future Legends</p>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Free Agency</h1>
          <p className="mt-2 text-sm text-slate-400">Browse listed cards and make offers to buy from other collectors.</p>
        </div>
        <MarketplaceSubNav />
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Search</label>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Player, team, or card ID…"
              className="mt-1 min-h-[44px] w-full rounded-xl border border-white/15 bg-cardBg px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Tier</label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-white/15 bg-cardBg px-3 py-2 text-sm text-slate-100"
            >
              {TIER_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
                    <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Grad year</label>
            <select
              value={gradYear}
              onChange={(e) => setGradYear(e.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-white/15 bg-cardBg px-3 py-2 text-sm text-slate-100"
            >
              <option value="">All years</option>
              {gradYears.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>
                    <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Sort</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-white/15 bg-cardBg px-3 py-2 text-sm text-slate-100"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error ? (
          <div className="mb-6 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>
        ) : null}
        {loading ? (
          <MarketplaceGridSkeleton />
        ) : filtered.length === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-cardBg/50 px-6 py-16 text-center">
            <p className="text-lg text-slate-300">No cards listed right now.</p>
            <p className="mt-2 text-sm text-slate-500">Check back soon or list one from your collection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((listing) => (
              <MarketplaceCardGridItem key={listing.card_id} listing={listing} />
            ))}
          </div>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
