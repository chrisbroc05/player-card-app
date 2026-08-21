import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import CardImage from "../components/CardImage";
import { API_BASE_URL, authHeaders } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { formatMoney } from "../utils/marketplace";
import { profileSlug } from "../utils/profileLinks";
import { cardMediaFrameClass } from "../utils/highlightCard";
import { vaultTierBadge } from "../utils/tierStyles";
import { formatApiError } from "../utils/authFetch";

function ProfileKpi({ label, value }) {
  return (
    <div className="public-profile__kpi">
      <p className="public-profile__kpi-value">{value}</p>
      <p className="public-profile__kpi-label">{label}</p>
    </div>
  );
}

function RequestTradeModal({ open, onClose, profile, targetCard, token, onSent }) {
  const [myCards, setMyCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !token) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/cards/my-cards`, {
          headers: { ...authHeaders(token) },
        });
        const data = await res.json().catch(() => []);
        if (!cancelled) {
          const rows = Array.isArray(data) ? data.filter((c) => (c.status || "active") === "active") : [];
          setMyCards(rows);
          setSelectedCardId(rows[0]?.card_id || "");
        }
      } catch {
        if (!cancelled) setMyCards([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, token]);

  useEffect(() => {
    if (!open) return;
    if (targetCard?.player_name) {
      setMessage(`I'd like to trade for your ${targetCard.player_name} card.`);
    } else {
      setMessage("");
    }
    setError("");
  }, [open, targetCard]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!token || !selectedCardId || !profile?.display_name) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/trades/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({
          card_id: selectedCardId,
          recipient_identifier: profile.display_name,
          message: message.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Could not send trade offer."));
      onSent?.();
      onClose();
    } catch (err) {
      setError(err.message || "Trade offer failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="settings-modal-overlay" role="presentation" onClick={onClose}>
      <div className="settings-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3 className="settings-modal__title">Request Trade</h3>
        <p className="settings-modal__hint">
          Send a trade offer to <strong>{profile?.display_name}</strong>
          {targetCard?.player_name ? ` for their ${targetCard.player_name} card` : ""}.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="contact-form__field">
            <label className="contact-form__label" htmlFor="trade-card-select">
              Your card to offer
            </label>
            <select
              id="trade-card-select"
              className="contact-form__select"
              value={selectedCardId}
              onChange={(e) => setSelectedCardId(e.target.value)}
              required
            >
              {myCards.length === 0 ? <option value="">No cards available</option> : null}
              {myCards.map((c) => (
                <option key={c.card_id} value={c.card_id}>
                  {c.player_name} ({c.card_id})
                </option>
              ))}
            </select>
          </div>
          <div className="contact-form__field">
            <label className="contact-form__label" htmlFor="trade-message">
              Message (optional)
            </label>
            <textarea
              id="trade-message"
              className="contact-form__textarea"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          {error ? <p className="contact-form__error">{error}</p> : null}
          <div className="settings-modal__actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn-primary" disabled={busy || !selectedCardId} onClick={handleSubmit}>
              {busy ? "Sending…" : "Send Trade Offer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PublicProfileCard({ card, cardAutoplay, showTradeActions, onRequestTrade, onMakeOffer }) {
  const badge = vaultTierBadge(card.tier);
  const listed = Boolean(card.listed_on_marketplace);

  return (
    <article className={`public-profile-card rounded-2xl border border-white/10 bg-cardBg p-3 shadow-lg ${badge.glow}`}>
      <div className={`relative collection-card-stage collection-card-stage--normal`}>
        <CardImage
          card={card}
          alt={card.player_name}
          cacheBust={card.created_at}
          frameClassName={`${cardMediaFrameClass(card)} w-full`}
          playOnHover={cardAutoplay}
          showInfoBanner
        />
        {listed ? <span className="public-profile-card__listed-badge">For Sale</span> : null}
      </div>
      <div className="mt-3 space-y-2 px-1">
        {listed && card.asking_price != null ? (
          <p className="text-center text-sm font-bold text-[var(--color-gold-primary)] tabular-nums">
            {formatMoney(card.asking_price)}
          </p>
        ) : null}
        <Link
          to={`/card/${encodeURIComponent(card.shareable_slug)}`}
          className="inline-flex min-h-[40px] w-full items-center justify-center rounded-lg border border-white/20 bg-cardBg2 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-[var(--color-gold-bright)/50] hover:text-white"
        >
          View Card
        </Link>
        {showTradeActions && listed ? (
          <button type="button" className="btn-primary w-full min-h-[40px] text-sm" onClick={() => onMakeOffer(card)}>
            Make Offer
          </button>
        ) : null}
        {showTradeActions && !listed ? (
          <button
            type="button"
            className="w-full min-h-[40px] rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-white/30"
            onClick={() => onRequestTrade(card)}
          >
            Request Trade
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default function PublicProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user, token, initializing } = useAuth();
  const { settings } = useSettings();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [tradeTargetCard, setTradeTargetCard] = useState(null);
  const [tradeSuccess, setTradeSuccess] = useState("");

  const cardAutoplay = settings?.autoplay_videos !== false;
  const gridClass = "collection-grid card-grid";

  const loadProfile = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/profile/${encodeURIComponent(username)}`, {
        headers: token ? { ...authHeaders(token) } : {},
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Profile not found."));
      setProfile(data);
    } catch (e) {
      setError(e.message || "Could not load profile.");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [username, token]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const isOwnProfile = useMemo(() => {
    if (profile?.is_own_profile) return true;
    if (!user?.display_name || !username) return false;
    return profileSlug(user.display_name) === profileSlug(username);
  }, [profile?.is_own_profile, user?.display_name, username]);

  if (!initializing && isOwnProfile && username) {
    return <Navigate to="/profile" replace />;
  }

  function openTradeModal(card = null) {
    if (!token) {
      navigate("/login", { state: { from: `/profile/${username}` } });
      return;
    }
    setTradeTargetCard(card);
    setTradeModalOpen(true);
  }

  function handleMakeOffer(card) {
    if (!token) {
      navigate("/login", { state: { from: `/marketplace/${card.card_id}` } });
      return;
    }
    navigate(`/marketplace/${encodeURIComponent(card.card_id)}`);
  }

  const showTradeActions = profile && !profile.is_own_profile;
  const unlistedPublic = (profile?.public_cards || []).filter((c) => !c.listed_on_marketplace);

  return (
    <div className="min-h-screen bg-appBg text-slate-100">
      <AppHeader />

      <main className="public-profile-page">
        <div className="support-page__header">
          <button type="button" className="support-page__back" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>
          <div>
            <h1 className="support-page__title">{profile?.display_name || username}</h1>
            {profile ? (
              <p className="support-page__subtitle">
                Member since {profile.member_since} · {profile.stats?.total_public_cards ?? 0} public cards
              </p>
            ) : null}
          </div>
        </div>

        {tradeSuccess ? (
          <div className="support-page__success" role="status">
            {tradeSuccess}
          </div>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-[var(--color-gold-primary)]" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-6 text-sm text-rose-100">{error}</div>
        ) : profile ? (
          <>
            {showTradeActions ? (
              <div className="public-profile__actions">
                <button type="button" className="btn-primary min-h-[44px] px-5 text-sm" onClick={() => openTradeModal(null)}>
                  Send Trade Offer
                </button>
              </div>
            ) : null}

            <section className="public-profile__stats">
              <div className="public-profile__kpi-grid">
                <ProfileKpi label="Public Cards" value={profile.stats?.total_public_cards ?? 0} />
                <ProfileKpi label="Cards Traded" value={profile.stats?.cards_traded ?? 0} />
                <ProfileKpi label="Cards Sold" value={profile.stats?.cards_sold ?? 0} />
              </div>
            </section>

            {profile.listed_cards?.length > 0 ? (
              <section className="public-profile__section">
                <h2 className="public-profile__section-title">Listed for Sale</h2>
                <div className={gridClass}>
                  {profile.listed_cards.map((card) => (
                    <PublicProfileCard
                      key={`listed-${card.card_id}`}
                      card={card}
                      cardAutoplay={cardAutoplay}
                      showTradeActions={showTradeActions}
                      onMakeOffer={handleMakeOffer}
                      onRequestTrade={openTradeModal}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <section className="public-profile__section">
              <h2 className="public-profile__section-title">Public Collection</h2>
              {unlistedPublic.length === 0 && profile.listed_cards?.length === 0 ? (
                <p className="text-sm text-slate-500">No public cards to show.</p>
              ) : unlistedPublic.length === 0 ? (
                <p className="text-sm text-slate-500">All public cards are listed above.</p>
              ) : (
                <div className={gridClass}>
                  {unlistedPublic.map((card) => (
                    <PublicProfileCard
                      key={card.card_id}
                      card={card}
                      cardAutoplay={cardAutoplay}
                      showTradeActions={showTradeActions}
                      onMakeOffer={handleMakeOffer}
                      onRequestTrade={openTradeModal}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </main>

      <AppFooter />

      <RequestTradeModal
        open={tradeModalOpen}
        onClose={() => setTradeModalOpen(false)}
        profile={profile}
        targetCard={tradeTargetCard}
        token={token}
        onSent={() => setTradeSuccess("Trade offer sent! Waiting for a response.")}
      />
    </div>
  );
}
