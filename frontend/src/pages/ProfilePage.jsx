import React, { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import CardImage from "../components/CardImage";
import { API_BASE_URL, AUTH_TOKEN_STORAGE_KEY, authHeaders } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { formatMoney } from "../utils/marketplace";
import { CARD_IMAGE_FRAME_SM } from "../utils/cardImageStyles";
import { RecentActivitySection } from "../components/ActivityHistory";

function formatApiError(detail, fallback) {
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const msgs = detail.map((i) => (typeof i === "string" ? i : i?.msg)).filter(Boolean);
    return msgs.length ? msgs.join(" | ") : fallback;
  }
  return fallback;
}

function tierValueClass(tierLabel) {
  const t = (tierLabel || "").toLowerCase();
  if (t === "rookie") return "text-orange-300";
  if (t === "all-star" || t === "allstar") return "text-cyan-300";
  if (t === "legends") return "text-amber-200";
  return "text-slate-500";
}

function StatCard({ icon, label, value, valueClass }) {
  return (
    <div className="rounded-xl border border-white/10 bg-cardBg2 p-4 shadow-inner shadow-black/20">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-cardBg text-slate-300">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-semibold tabular-nums text-white">
            <span className={valueClass || ""}>{value}</span>
          </p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

const iconCards = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h12v12H6V6z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9h6v6H9V9z" />
  </svg>
);
const iconSpark = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 00-3.09 3.09z" />
  </svg>
);
const iconSend = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
  </svg>
);
const iconInbox = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 3.75H15M9 12h6m-6 4.5h6M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
  </svg>
);
const iconLayers = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L12 12.75l5.571-3M6.429 12.75L12 15.75l5.571-3m-11.142 3L12 21.75l5.571-3" />
  </svg>
);
const iconDollar = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const iconPlay = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
  </svg>
);
const iconTrophy = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3H15a3 3 0 01-3-3h6zm-9 0a3 3 0 00-3 3H9a3 3 0 003-3zM6.75 7.5v7.5m10.5-7.5v7.5m-12-3h13.5m-13.5 0A2.25 2.25 0 013.75 9.75v-1.5A2.25 2.25 0 016 6h12a2.25 2.25 0 012.25 2.25v1.5a2.25 2.25 0 01-2.25 2.25m-13.5 0h13.5" />
  </svg>
);

export default function ProfilePage() {
  const { token, user, initializing } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connectBanner, setConnectBanner] = useState("");

  const loadProfile = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/auth/profile`, {
        headers: { ...authHeaders(token) },
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Could not load profile."));
      setProfile(data);
    } catch (e) {
      setError(e.message || "Failed to load profile.");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token || initializing) return;
    loadProfile();
  }, [token, initializing, loadProfile]);

  useEffect(() => {
    const connect = searchParams.get("connect");
    if (connect === "complete") {
      setConnectBanner("success");
      loadProfile();
      setSearchParams({}, { replace: true });
    } else if (connect === "refresh") {
      setConnectBanner("refresh");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, loadProfile]);

  if (!initializing && !user) {
    return <Navigate to="/login" replace />;
  }

  const initial = (profile?.display_name || user?.display_name || "?").trim().charAt(0).toUpperCase() || "?";

  const dash = "—";
  const fav = profile?.favorite_tier;
  const favDisplay = fav || "None yet";
  const favClass = fav ? tierValueClass(fav) : "text-slate-500";

  const mp = profile?.marketplace_stats;
  const animatedCardsOwned = profile?.animated_cards_owned ?? 0;
  const highlightCardsOwned = profile?.highlight_cards_owned ?? 0;
  const showMarketplace =
    mp &&
    (mp.total_spent > 0 ||
      mp.total_earned > 0 ||
      mp.total_offers_made > 0 ||
      mp.active_listings > 0);

  return (
    <div className="min-h-screen overflow-x-hidden bg-appBg text-slate-100">
      <AppHeader />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {error ? (
          <div className="mb-6 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => loadProfile()}
              className="mt-3 rounded-lg border border-rose-400/40 bg-rose-500/20 px-3 py-2 text-xs font-medium text-rose-50 hover:bg-rose-500/30"
            >
              Retry
            </button>
          </div>
        ) : null}

        {connectBanner === "success" ? (
          <div className="mb-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            Bank account connected successfully! You can now receive payouts.
          </div>
        ) : null}
        {connectBanner === "refresh" ? (
          <div className="mb-6 rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
            Please complete your account verification to enable payouts.
          </div>
        ) : null}

        <div className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-cardBg p-6 shadow-xl shadow-black/30 sm:flex-row sm:items-center sm:gap-8 sm:p-8">
          <div
            className="mx-auto flex h-24 w-24 shrink-0 items-center justify-center rounded-full text-3xl font-bold text-white shadow-lg sm:mx-0 sm:h-28 sm:w-28"
            style={{
              background: "linear-gradient(135deg, rgba(56,189,248,0.35), rgba(139,92,246,0.45), rgba(20,184,166,0.35))",
            }}
            aria-hidden
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {loading ? user?.display_name || dash : profile?.display_name || user?.display_name}
            </h1>
            <p className="mt-1 truncate text-sm text-slate-400">{loading ? user?.email || dash : profile?.email || user?.email}</p>
            <p className="mt-2 text-sm text-slate-500">
              Member since {loading ? dash : profile?.member_since || "—"}
            </p>
          </div>
        </div>

        <section className="mt-8 rounded-2xl border border-white/10 bg-cardBg p-6">
          <h2 className="text-lg font-semibold text-white">Account settings</h2>
          <ParentEmailSettings token={token} profile={profile} onSaved={loadProfile} />
        </section>

        <section className="mt-8 rounded-2xl border border-white/10 bg-cardBg p-6">
          <h2 className="text-lg font-semibold text-white">Payout Settings</h2>
          <PayoutSettings token={token} profile={profile} loading={loading} />
        </section>

        <section className="mt-8">
          <h2 className="sr-only">Your stats</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={iconCards}
              label="Cards in Collection"
              value={loading ? dash : profile?.total_cards_owned ?? 0}
            />
            <StatCard
              icon={iconSpark}
              label="Total Cards Created"
              value={loading ? dash : profile?.total_cards_ever_created ?? 0}
            />
            <StatCard
              icon={iconSend}
              label="Cards Traded Away"
              value={loading ? dash : profile?.cards_traded_away ?? 0}
            />
            <StatCard
              icon={iconInbox}
              label="Cards Received"
              value={loading ? dash : profile?.cards_received_via_trade ?? 0}
            />
            <StatCard
              icon={iconLayers}
              label="Total Print Run Copies"
              value={loading ? dash : profile?.total_print_run_copies ?? 0}
            />
            <StatCard
              icon={iconTrophy}
              label="Favorite Tier"
              value={loading ? dash : favDisplay}
              valueClass={favClass}
            />
            {!loading && animatedCardsOwned > 0 ? (
              <div className="rounded-xl border border-violet-400/35 bg-gradient-to-br from-violet-500/15 via-cardBg2 to-cardBg2 p-4 shadow-[0_0_24px_rgba(139,92,246,0.15)]">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-violet-400/30 bg-violet-500/20 text-violet-100">
                    {iconPlay}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-2xl font-semibold tabular-nums text-violet-100">{animatedCardsOwned}</p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-violet-200/70">
                      Animated Cards
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
            {!loading && highlightCardsOwned > 0 ? (
              <div className="rounded-xl border border-[#D85A30]/35 bg-gradient-to-br from-[#D85A30]/15 via-cardBg2 to-cardBg2 p-4 shadow-[0_0_24px_rgba(216,90,48,0.15)]">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#D85A30]/30 bg-[#D85A30]/20 text-orange-100">
                    🎬
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-2xl font-semibold tabular-nums text-orange-100">{highlightCardsOwned}</p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-orange-200/70">
                      Highlight Cards
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {token ? <RecentActivitySection token={token} limit={5} /> : null}

        {!loading && showMarketplace ? (
          <section className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-white">Marketplace Activity</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard icon={iconDollar} label="Spent on Cards" value={formatMoney(mp.total_spent)} valueClass="text-neonTeal" />
              <StatCard icon={iconDollar} label="Earned from Sales" value={formatMoney(mp.total_earned)} valueClass="text-neonTeal" />
              <StatCard icon={iconCards} label="Cards Listed" value={mp.active_listings} />
              <StatCard icon={iconSend} label="Completed Purchases" value={mp.total_offers_made} />
            </div>
            {(mp.highest_purchase || mp.highest_sale) ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {mp.highest_purchase ? (
                  <div className="rounded-xl border border-white/10 bg-cardBg2 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Biggest Purchase</p>
                    <div className="mt-3 flex gap-3">
                      <CardImage
                        imageUrl={mp.highest_purchase.image_url}
                        alt={mp.highest_purchase.player_name}
                        frameClassName={CARD_IMAGE_FRAME_SM}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white">{mp.highest_purchase.player_name}</p>
                        <p className="mt-1 text-lg font-semibold text-neonTeal">
                          {formatMoney(mp.highest_purchase.offer_amount)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
                {mp.highest_sale ? (
                  <div className="rounded-xl border border-white/10 bg-cardBg2 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Biggest Sale</p>
                    <div className="mt-3 flex gap-3">
                      <CardImage
                        imageUrl={mp.highest_sale.image_url}
                        alt={mp.highest_sale.player_name}
                        frameClassName={CARD_IMAGE_FRAME_SM}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white">{mp.highest_sale.player_name}</p>
                        <p className="mt-1 text-lg font-semibold text-neonTeal">
                          {formatMoney(mp.highest_sale.offer_amount)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {loading ? (
          <div className="mt-10 flex min-h-[120px] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-neonBlue" />
          </div>
        ) : (
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-white/10 bg-cardBg p-5 shadow-inner shadow-black/20">
              <h2 className="text-lg font-semibold text-white">Rarest Card Owned</h2>
              {profile?.rarest_card ? (
                <div className="mt-4">
                  <div className="mx-auto max-w-[220px] sm:mx-0">
                    <CardImage
                      card={profile.rarest_card}
                      alt={profile.rarest_card.player_name}
                      frameClassName={CARD_IMAGE_FRAME_SM}
                    />
                  </div>
                  <dl className="mt-4 space-y-1 text-sm">
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Card ID</dt>
                      <dd className="font-mono text-neonTeal/90">{profile.rarest_card.card_id}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Player</dt>
                      <dd className="text-slate-200">{profile.rarest_card.player_name}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Tier</dt>
                      <dd className="text-slate-300">{profile.rarest_card.tier}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Print run</dt>
                      <dd className="text-slate-200">Print run of {profile.rarest_card.print_run}</dd>
                    </div>
                  </dl>
                  <p className="mt-2 text-xs text-slate-500">Lower print run is rarer.</p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  No cards yet —{" "}
                  <Link to="/" className="font-medium text-neonTeal underline decoration-white/20 underline-offset-2 hover:text-teal-200">
                    go create one
                  </Link>
                  !
                </p>
              )}
            </section>

            <section className="rounded-xl border border-white/10 bg-cardBg p-5 shadow-inner shadow-black/20">
              <h2 className="text-lg font-semibold text-white">Quick links</h2>
              <ul className="mt-4 space-y-3">
                <li>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">My Collection</p>
                  <Link
                    to="/my-collection"
                    className="mt-1 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-white/15 bg-cardBg2 px-4 text-sm font-medium text-slate-100 transition hover:border-neonBlue/40 hover:bg-neonBlue/10"
                  >
                    Open collection
                  </Link>
                </li>
                <li>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Free Agency Marketplace</p>
                  <Link
                    to="/marketplace"
                    className="mt-1 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-white/15 bg-cardBg2 px-4 text-sm font-medium text-slate-100 transition hover:border-teal-400/40 hover:bg-teal-500/10"
                  >
                    Browse marketplace
                  </Link>
                </li>
                <li>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">My Listings</p>
                  <Link
                    to="/marketplace/my-listings"
                    className="mt-1 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-white/15 bg-cardBg2 px-4 text-sm font-medium text-slate-100 transition hover:border-teal-400/40 hover:bg-teal-500/10"
                  >
                    Manage listings
                  </Link>
                </li>
                <li>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Trade Center</p>
                  <Link
                    to="/trades"
                    className="mt-1 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-white/15 bg-cardBg2 px-4 text-sm font-medium text-slate-100 transition hover:border-amber-400/40 hover:bg-amber-500/10"
                  >
                    Trades
                  </Link>
                </li>
                <li>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Card Vault</p>
                  <Link
                    to="/vault"
                    className="mt-1 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-white/15 bg-cardBg2 px-4 text-sm font-medium text-slate-100 transition hover:border-violet-400/40 hover:bg-violet-500/10"
                  >
                    Vault
                  </Link>
                </li>
              </ul>
            </section>
          </div>
        )}
      </main>

      <AppFooter />
    </div>
  );
}

function ParentEmailSettings({ token, profile, onSaved }) {
  const [parentEmail, setParentEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setParentEmail(profile?.parent_email || "");
  }, [profile?.parent_email]);

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    const trimmed = parentEmail.trim();
    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid parent email address.");
      return;
    }
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/update-profile`, {
        method: "POST",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({ parent_email: trimmed || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Could not save settings."));
      setMessage("Parent email saved.");
      await onSaved?.();
    } catch (err) {
      setError(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="mt-4 max-w-md space-y-3">
      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Parent or Guardian Email
        </label>
        <input
          type="email"
          value={parentEmail}
          onChange={(e) => setParentEmail(e.target.value)}
          placeholder="parent@email.com"
          className="mt-1 min-h-[44px] w-full rounded-lg border border-white/15 bg-cardBg2 px-3 py-2 text-slate-100 placeholder:text-slate-500"
        />
        <p className="mt-1 text-xs text-slate-500">
          If provided, a parent or guardian will receive copies of important account notifications.
        </p>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="min-h-[40px] rounded-lg bg-neonTeal px-4 text-sm font-semibold text-slate-950 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
    </form>
  );
}

function PayoutSettings({ token, profile, loading }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const connected =
    profile?.stripe_onboarding_complete === true && profile?.stripe_payouts_enabled === true;
  const pending =
    !connected &&
    profile?.stripe_account_status === "pending" &&
    profile?.stripe_onboarding_complete !== true;

  async function startOnboarding() {
    const authToken = (token || localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "").trim();
    console.log("Connect token available:", Boolean(authToken));
    if (!authToken) {
      const msg = "Not signed in. Please log in again.";
      console.error("Connect button error: no auth token");
      setError(msg);
      alert(msg);
      return;
    }
    setError("");
    setBusy(true);
    try {
      const url = `${API_BASE_URL}/connect/onboarding-link`;
      console.log("Connect request URL:", url);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });

      console.log("Connect response status:", response.status);
      const data = await response.json().catch(() => ({}));
      console.log("Connect response data:", data);

      if (response.status === 503) {
        throw new Error(formatApiError(data?.detail, "Payments not yet enabled"));
      }
      if (!response.ok) {
        throw new Error(formatApiError(data?.detail, "Could not start bank connection."));
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      console.error("No URL in response:", data);
      alert(`Error: ${JSON.stringify(data)}`);
      setError("No onboarding URL returned.");
    } catch (err) {
      console.error("Connect button error:", err);
      const msg = err?.message || "Request failed";
      alert(`Request failed: ${msg}`);
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function openDashboard() {
    if (!token) return;
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/connect/dashboard-link`, {
        method: "POST",
        headers: { ...authHeaders(token) },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Could not open payout dashboard."));
      if (data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
        return;
      }
      throw new Error("No dashboard URL returned.");
    } catch (e) {
      setError(e.message || "Dashboard link failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="mt-4 text-sm text-slate-500">Loading payout settings…</p>;
  }

  if (connected) {
    return (
      <div className="mt-4 space-y-4">
        <span className="inline-flex rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">
          Bank Account Connected
        </span>
        <p className="text-sm text-slate-400">
          Payouts enabled. Earnings from card sales will be available to withdraw.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={openDashboard}
          className="min-h-[44px] rounded-xl border border-teal-500/40 bg-teal-500/10 px-4 text-sm font-semibold text-neonTeal disabled:opacity-50"
        >
          {busy ? "Opening…" : "Manage Payout Settings"}
        </button>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      </div>
    );
  }

  if (pending) {
    return (
      <div className="mt-4 space-y-4">
        <span className="inline-flex rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-200">
          Verification Pending
        </span>
        <p className="text-sm text-slate-400">
          Stripe is reviewing your account. This usually takes 1-2 business days.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={startOnboarding}
          className="min-h-[44px] rounded-xl bg-neonTeal px-4 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          {busy ? "Redirecting…" : "Complete Verification"}
        </button>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-slate-400">
        Connect your bank account to withdraw earnings from card sales.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={startOnboarding}
        className="min-h-[44px] rounded-xl bg-neonTeal px-4 text-sm font-semibold text-slate-950 disabled:opacity-50"
      >
        {busy ? "Redirecting…" : "Connect Bank Account"}
      </button>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
