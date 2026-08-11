import React, { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import CardImage from "../components/CardImage";
import { ProfileActivityCompactList } from "../components/ActivityHistory";
import { API_BASE_URL, AUTH_TOKEN_STORAGE_KEY, authHeaders } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { formatMoney } from "../utils/marketplace";
import { formatEditionShort } from "../utils/tierStyles";

function formatApiError(detail, fallback) {
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const msgs = detail.map((i) => (typeof i === "string" ? i : i?.msg)).filter(Boolean);
    return msgs.length ? msgs.join(" | ") : fallback;
  }
  return fallback;
}

function formatProfileDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function rarityEditionDisplay(editionNumber, printRun) {
  const e = Number(editionNumber) || 1;
  const p = Number(printRun) || 1;
  const text = formatEditionShort(e, p);
  if (p === 1) return { text, tone: "gold" };
  if (p <= 5) return { text, tone: "silver" };
  if (p <= 10) return { text, tone: "bronze" };
  return { text, tone: "default" };
}

function ProfileKpi({ label, value }) {
  return (
    <div className="profile-page__kpi">
      <p className="profile-page__kpi-value">{value}</p>
      <p className="profile-page__kpi-label">{label}</p>
    </div>
  );
}

function ProfileHighlightCard({ label, children, footer }) {
  return (
    <div className="profile-highlight">
      <p className="profile-highlight__label">{label}</p>
      <div className="profile-highlight__card-stage">{children}</div>
      {footer ? <div className="profile-highlight__footer">{footer}</div> : null}
    </div>
  );
}

function ProfileCardThumb({ card }) {
  if (!card) return null;
  return (
    <div className="profile-highlight__thumb">
      <CardImage
        card={card}
        alt={card.player_name || "Card"}
        frameClassName="profile-highlight__frame"
        showInfoBanner
        playOnHover
      />
    </div>
  );
}

function CardPlaceholder({ icon, message, linkTo, linkLabel }) {
  return (
    <div className="profile-highlight__placeholder">
      <span className="profile-highlight__placeholder-icon" aria-hidden>
        {icon}
      </span>
      <p className="profile-highlight__placeholder-text">{message}</p>
      {linkTo ? (
        <Link to={linkTo} className="profile-highlight__placeholder-link">
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}

function ProfileRecentActivity({ token }) {
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/activity/history?limit=5`, {
          headers: { ...authHeaders(token) },
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok) {
          setItems(Array.isArray(data.items) ? data.items : []);
        } else if (!cancelled) {
          setItems([]);
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, location.key]);

  return (
    <section>
      <div className="profile-page__activity-head">
        <h2 className="profile-page__section-title">Recent Activity</h2>
        <Link to="/trades#activity-history" className="profile-page__activity-link">
          View All →
        </Link>
      </div>
      <ProfileActivityCompactList items={items} loading={loading} />
      {!loading && items.length > 0 ? (
        <div className="profile-page__activity-footer">
          <Link to="/trades#activity-history" className="profile-page__activity-btn">
            View All Activity
          </Link>
        </div>
      ) : null}
    </section>
  );
}

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

  const dash = "—";
  const mp = profile?.marketplace_stats;
  const biggestSale = mp?.highest_sale ?? null;
  const rarestCard = profile?.rarest_card ?? null;
  const rarity = rarestCard
    ? rarityEditionDisplay(rarestCard.edition_number, rarestCard.print_run)
    : null;

  return (
    <div className="min-h-screen bg-appBg text-slate-100">
      <AppHeader />

      <main className="profile-page">
        {error ? (
          <div className="profile-page__banner profile-page__banner--error">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => loadProfile()}
              className="mt-2 rounded-lg border border-rose-400/40 bg-rose-500/20 px-3 py-2 text-xs font-medium text-rose-50 hover:bg-rose-500/30"
            >
              Retry
            </button>
          </div>
        ) : null}

        {connectBanner === "success" ? (
          <div className="profile-page__banner profile-page__banner--success">
            Bank account connected successfully! You can now receive payouts.
          </div>
        ) : null}
        {connectBanner === "refresh" ? (
          <div className="profile-page__banner profile-page__banner--info">
            Please complete your account verification to enable payouts.
          </div>
        ) : null}

        {loading ? (
          <div className="profile-page__loading">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-neonBlue" />
          </div>
        ) : (
          <div className="profile-page__sections">
            {/* Section 1 — User header */}
            <section className="profile-page__header">
              <h1 className="profile-page__name">
                {profile?.display_name || user?.display_name || dash}
              </h1>
              <p className="profile-page__member-since">
                Member since {profile?.member_since || dash}
              </p>
              <div className="profile-page__header-row">
                <span className="profile-page__balance">
                  Balance: {formatMoney(profile?.credit_balance ?? 0)}
                </span>
                <a href="#payout-settings" className="profile-page__payout-link">
                  Payout settings
                </a>
              </div>
            </section>

            <hr className="profile-page__divider" />

            {/* Section 2 — Stats */}
            <section>
              <h2 className="profile-page__section-title">Your Stats</h2>
              <div className="profile-page__kpi-grid">
                <ProfileKpi label="Cards Owned" value={profile?.total_cards_owned ?? 0} />
                <ProfileKpi label="Cards Created" value={profile?.total_cards_ever_created ?? 0} />
                <ProfileKpi label="Cards Traded" value={profile?.cards_traded_away ?? 0} />
                <ProfileKpi label="Cards Received" value={profile?.cards_received_via_trade ?? 0} />
              </div>
              <div className="profile-page__kpi-grid profile-page__kpi-grid--secondary">
                <ProfileKpi label="Animated Cards" value={profile?.animated_cards_owned ?? 0} />
                <ProfileKpi label="Highlight Cards" value={profile?.highlight_cards_owned ?? 0} />
                <ProfileKpi
                  label="Marketplace Activity"
                  value={profile?.marketplace_activity_count ?? 0}
                />
              </div>
            </section>

            <hr className="profile-page__divider" />

            {/* Section 3 — Highlight cards */}
            <section className="profile-page__highlights-section">
              <div className="profile-page__highlights">
                <ProfileHighlightCard
                  label="Biggest Sale"
                  footer={
                    biggestSale?.card ? (
                      <>
                        <p className="profile-highlight__amount">
                          Sold for {formatMoney(biggestSale.offer_amount)}
                        </p>
                        {biggestSale.buyer_display_name ? (
                          <p className="profile-highlight__meta">
                            Buyer: @{biggestSale.buyer_display_name}
                          </p>
                        ) : null}
                        {biggestSale.accepted_at ? (
                          <p className="profile-highlight__meta">
                            Date: {formatProfileDate(biggestSale.accepted_at)}
                          </p>
                        ) : null}
                      </>
                    ) : null
                  }
                >
                  {biggestSale?.card ? (
                    <ProfileCardThumb card={biggestSale.card} />
                  ) : (
                    <CardPlaceholder icon="💰" message="No sales yet" />
                  )}
                </ProfileHighlightCard>

                <ProfileHighlightCard
                  label="Rarest Card Owned"
                  footer={
                    rarestCard && rarity ? (
                      <p
                        className={`profile-highlight__rarity profile-highlight__rarity--${rarity.tone}`}
                      >
                        {rarity.text}
                      </p>
                    ) : null
                  }
                >
                  {rarestCard ? (
                    <ProfileCardThumb card={rarestCard} />
                  ) : (
                    <CardPlaceholder
                      icon="🃏"
                      message="Create your first card"
                      linkTo="/"
                      linkLabel="Go to Card Studio"
                    />
                  )}
                </ProfileHighlightCard>
              </div>
            </section>

            <hr className="profile-page__divider" />

            {/* Section 4 — Recent Activity */}
            {token ? <ProfileRecentActivity token={token} /> : null}

            {/* Account settings (parent email) */}
            <section className="profile-page__account">
              <h2 className="profile-page__section-title">Account Settings</h2>
              <ParentEmailSettings token={token} profile={profile} onSaved={loadProfile} />
            </section>

            {/* Section 5 — Payout Settings */}
            <hr className="profile-page__divider" />
            <section id="payout-settings">
              <h2 className="profile-page__section-title">Payout Settings</h2>
              <PayoutSettings token={token} profile={profile} loading={loading} />
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
    <form onSubmit={handleSave} className="max-w-md space-y-3">
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
    if (!authToken) {
      setError("Not signed in. Please log in again.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const response = await fetch(`${API_BASE_URL}/connect/onboarding-link`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json().catch(() => ({}));
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
      setError("No onboarding URL returned.");
    } catch (err) {
      setError(err?.message || "Request failed");
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
    return <p className="text-sm text-slate-500">Loading payout settings…</p>;
  }

  if (connected) {
    return (
      <div className="space-y-4">
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
          {busy ? "Opening…" : "Manage Payouts"}
        </button>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      </div>
    );
  }

  if (pending) {
    return (
      <div className="space-y-4">
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
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Connect your bank account to receive payments when you sell cards.
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
