import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import LogoutConfirmModal from "../components/LogoutConfirmModal";
import CardImage from "../components/CardImage";
import ProfileHeader from "../components/profile/ProfileHeader";
import ProfileBalanceCard from "../components/profile/ProfileBalanceCard";
import ProfileStatSheet from "../components/profile/ProfileStatSheet";
import ProfileTransactionHistory from "../components/profile/ProfileTransactionHistory";
import ProfileSettingsMenu from "../components/profile/ProfileSettingsMenu";
import { ProfileActivityCompactList } from "../components/ActivityHistory";
import { getCardBannerStyles } from "../utils/cardBannerStyles";
import { API_BASE_URL, AUTH_TOKEN_STORAGE_KEY, authHeaders } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { performLogout } from "../utils/logout";
import { formatMoney } from "../utils/marketplace";
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
  const { settings } = useSettings();
  const cardAutoplay = settings?.autoplay_videos !== false;
  if (!card) return null;
  return (
    <div className="profile-highlight__thumb">
      <CardImage
        card={card}
        alt={card.player_name || "Card"}
        frameClassName="profile-highlight__frame"
        showInfoBanner
        playOnHover={cardAutoplay}
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
        <h2 className="profile-section-title">Recent Activity</h2>
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
  const { token, user, initializing, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connectBanner, setConnectBanner] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [financials, setFinancials] = useState(null);
  const [financialsLoading, setFinancialsLoading] = useState(true);

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

  const updateProfileFields = useCallback((fields) => {
    setProfile((prev) => (prev ? { ...prev, ...fields } : prev));
  }, []);

  useEffect(() => {
    if (!token || initializing) return;
    loadProfile();
  }, [token, initializing, loadProfile]);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    (async () => {
      setFinancialsLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/auth/profile/financials`, {
          headers: { ...authHeaders(token) },
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok) setFinancials(data);
      } catch {
        if (!cancelled) setFinancials(null);
      } finally {
        if (!cancelled) setFinancialsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

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
  const displayName = profile?.display_name || user?.display_name || dash;
  const handle = profile?.display_name || user?.display_name || "";
  const mp = profile?.marketplace_stats;
  const biggestSale = mp?.highest_sale ?? null;
  const rarestCard = profile?.rarest_card ?? null;
  const rarestTierLabel = rarestCard
    ? getCardBannerStyles(rarestCard.tier, rarestCard.theme || rarestCard.special_theme).tierPillLabel
    : "";

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
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-[var(--color-gold-primary)]" />
          </div>
        ) : (
          <div className="profile-page__sections">
            <ProfileHeader displayName={displayName} handle={handle} />

            <ProfileBalanceCard
              marketplaceBalance={profile?.marketplace_balance ?? user?.marketplace_balance ?? 0}
              marketplaceEarnings={financials?.total_earned_from_sales ?? 0}
              totalWithdrawn={financials?.total_withdrawn ?? 0}
              loading={financialsLoading}
            />

            {token ? <ProfileStatSheet token={token} /> : null}

            <section id="collection-highlights" className="profile-page__collection-highlights">
              <h2 className="profile-section-title">Collection Highlights</h2>
              <div className="profile-page__highlights profile-page__highlights--solo">
                <ProfileHighlightCard
                  label="Rarest Card Owned"
                  footer={
                    rarestCard ? (
                      <>
                        <p className="profile-highlight__card-name">{rarestCard.player_name}</p>
                        {rarestTierLabel ? (
                          <p className="profile-highlight__meta">{rarestTierLabel}</p>
                        ) : null}
                      </>
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

            <section className="profile-page__highlights-section">
              <h2 className="profile-section-title">Biggest Sale</h2>
              <div className="profile-page__highlights profile-page__highlights--solo">
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
              </div>
            </section>

            {token ? <ProfileTransactionHistory token={token} /> : null}

            {token ? <ProfileRecentActivity token={token} /> : null}

            <ProfileSettingsMenu />

            <section id="payout-settings" className="profile-payout-section">
              <h2 className="profile-section-title">Payout Settings</h2>
              <PayoutSettings
                token={token}
                profile={profile}
                loading={loading}
                onProfileUpdate={updateProfileFields}
              />
            </section>

            <div className="profile-page__logout-wrap">
              <button
                type="button"
                className="profile-logout-btn"
                onClick={() => setShowLogoutConfirm(true)}
              >
                Log Out
              </button>
            </div>
          </div>
        )}
      </main>

      <AppFooter />

      {showLogoutConfirm ? (
        <LogoutConfirmModal
          onClose={() => setShowLogoutConfirm(false)}
          onConfirm={() => performLogout(logout)}
        />
      ) : null}
    </div>
  );
}

function PayoutSettings({ token, profile, loading, onProfileUpdate }) {
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const autoRefreshed = useRef(false);

  const chargesEnabled =
    profile?.stripe_charges_enabled === true || profile?.charges_enabled === true;
  const connected =
    chargesEnabled && profile?.stripe_payouts_enabled === true;
  const pending =
    !connected &&
    (profile?.stripe_connect_account_id || profile?.stripe_account_id) &&
    profile?.stripe_account_status === "pending";

  const refreshStatus = useCallback(async () => {
    const authToken = (token || localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "").trim();
    if (!authToken) {
      setError("Not signed in. Please log in again.");
      return;
    }
    setRefreshing(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/connect/refresh-status`, {
        method: "POST",
        headers: { ...authHeaders(authToken) },
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 503) {
        throw new Error(formatApiError(data?.detail, "Payments not yet enabled"));
      }
      if (!res.ok) {
        throw new Error(formatApiError(data?.detail, "Could not refresh payout status."));
      }
      onProfileUpdate?.({
        stripe_connect_account_id: data.stripe_connect_account_id ?? data.stripe_account_id,
        stripe_account_status: data.stripe_account_status,
        stripe_onboarding_complete: data.stripe_onboarding_complete,
        stripe_charges_enabled: data.stripe_charges_enabled ?? data.charges_enabled,
        stripe_payouts_enabled: data.stripe_payouts_enabled,
      });
    } catch (err) {
      setError(err?.message || "Refresh failed.");
    } finally {
      setRefreshing(false);
    }
  }, [token, onProfileUpdate]);

  useEffect(() => {
    if (loading) {
      autoRefreshed.current = false;
    }
  }, [loading]);

  useEffect(() => {
    if (loading || !profile || autoRefreshed.current) return;
    if (profile.stripe_account_status === "pending") {
      autoRefreshed.current = true;
      refreshStatus();
    }
  }, [loading, profile, refreshStatus]);

  async function startOnboarding() {
    const authToken = (token || localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "").trim();
    if (!authToken) {
      setError("Not signed in. Please log in again.");
      return;
    }
    setError("");
    setBusy(true);
    let redirecting = false;
    try {
      const response = await fetch(`${API_BASE_URL}/connect/onboarding-link`, {
        method: "POST",
        headers: {
          ...authHeaders(authToken),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          return_path: "/profile",
          refresh_path: "/profile",
        }),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 503) {
        throw new Error(formatApiError(data?.detail, "Payments not yet enabled"));
      }
      if (!response.ok) {
        throw new Error(formatApiError(data?.detail, "Could not start bank connection."));
      }
      if (data.url) {
        redirecting = true;
        window.location.assign(data.url);
        return;
      }
      setError("No onboarding URL returned.");
    } catch (err) {
      setError(err?.message || "Request failed");
    } finally {
      if (!redirecting) setBusy(false);
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
        <span className="inline-flex rounded-full border bg-success-subtle px-3 py-1 text-xs font-semibold text-success">
          Bank Account Connected
        </span>
        <p className="text-sm text-slate-400">
          Marketplace payouts enabled. Withdraw marketplace earnings from the Credits page.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={openDashboard}
          className="min-h-[44px] rounded-xl btn-secondary px-4 text-sm font-semibold disabled:opacity-50"
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
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-200">
            Verification Pending
          </span>
          <button
            type="button"
            disabled={busy || refreshing}
            onClick={refreshStatus}
            className="min-h-[32px] rounded-lg border border-white/15 bg-white/5 px-3 text-xs font-medium text-slate-300 disabled:opacity-50"
          >
            {refreshing ? "Refreshing…" : "↻ Refresh Status"}
          </button>
        </div>
        <p className="text-sm text-slate-400">
          Stripe is reviewing your account. This usually takes 1-2 business days.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={startOnboarding}
          className="min-h-[44px] rounded-xl btn-primary px-4 text-sm font-semibold text-slate-950 disabled:opacity-50"
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
        className="min-h-[44px] rounded-xl btn-primary px-4 text-sm font-semibold text-slate-950 disabled:opacity-50"
      >
        {busy ? "Redirecting…" : "Connect Bank Account"}
      </button>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
