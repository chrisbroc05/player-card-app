import React, { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  Trash2,
  User,
} from "lucide-react";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import LogoutConfirmModal from "../components/LogoutConfirmModal";
import SettingsToggle from "../components/SettingsToggle";
import { API_BASE_URL, authHeaders } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { useSettings, DEFAULT_SETTINGS, settingsFormatApiError } from "../context/SettingsContext";
import { performLogout } from "../utils/logout";
import { themeDisplayLabel } from "../utils/cardBannerStyles";

const TIER_OPTIONS = [
  { value: "rookie", label: "Rookie" },
  { value: "all_star", label: "All-Star" },
  { value: "legends", label: "Legends" },
];

function maskEmail(email) {
  if (!email) return "—";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}${"•".repeat(Math.max(2, local.length - 2))}@${domain}`;
}

function SettingsSection({ label, children }) {
  return (
    <section className="settings-section">
      <h2 className="settings-section__label">{label}</h2>
      <div className="settings-section__rows">{children}</div>
    </section>
  );
}

function SettingsToggleRow({ label, description, checked, onChange }) {
  return (
    <div className="settings-row">
      <div className="settings-row__text">
        <p className="settings-row__label">{label}</p>
        {description ? <p className="settings-row__desc">{description}</p> : null}
      </div>
      <SettingsToggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

function SettingsSelectRow({ label, description, value, options, onChange }) {
  return (
    <div className="settings-row settings-row--select">
      <div className="settings-row__text">
        <p className="settings-row__label">{label}</p>
        {description ? <p className="settings-row__desc">{description}</p> : null}
      </div>
      <select
        className="settings-select"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      >
        {options.map((opt) => (
          <option key={opt.value ?? "none"} value={opt.value ?? ""}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SettingsLinkRow({ label, description, value, to, onClick, danger = false }) {
  const inner = (
    <>
      <div className="settings-row__text">
        <p className={`settings-row__label${danger ? " settings-row__label--danger" : ""}`}>{label}</p>
        {description ? <p className="settings-row__desc">{description}</p> : null}
        {value ? <p className="settings-row__value">{value}</p> : null}
      </div>
      {!danger ? <ArrowRight className="settings-row__chevron" aria-hidden /> : null}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={`settings-row settings-row--link${danger ? " settings-row--danger" : ""}`}>
        {inner}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={`settings-row settings-row--link${danger ? " settings-row--danger" : ""}`}
      onClick={onClick}
    >
      {inner}
    </button>
  );
}

function SimpleModal({ title, children, onClose }) {
  return (
    <div className="settings-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="settings-modal-title" className="settings-modal__title">
          {title}
        </h3>
        {children}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { token, user, initializing, logout, refreshUser } = useAuth();
  const { settings, settingsLoaded, updateSetting } = useSettings();
  const [profile, setProfile] = useState(null);
  const [themeOptions, setThemeOptions] = useState([{ value: null, label: "None" }]);
  const [modal, setModal] = useState(null);
  const [modalValue, setModalValue] = useState("");
  const [modalError, setModalError] = useState("");
  const [modalBusy, setModalBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/profile`, {
          headers: { ...authHeaders(token) },
        });
        if (res.ok && !cancelled) {
          setProfile(await res.json());
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/themes`);
        if (!res.ok) return;
        const data = await res.json();
        const opts = [{ value: null, label: "None" }];
        const categories = Array.isArray(data?.categories) ? data.categories : [];
        const seen = new Set();
        for (const cat of categories) {
          for (const theme of cat.themes || []) {
            const id = theme?.id;
            if (!id || seen.has(id)) continue;
            seen.add(id);
            opts.push({ value: id, label: theme.name || themeDisplayLabel(id) || String(id) });
          }
        }
        if (!cancelled) setThemeOptions(opts);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const closeModal = useCallback(() => {
    setModal(null);
    setModalValue("");
    setModalError("");
    setDeleteConfirm("");
    setPasswordForm({ current: "", next: "", confirm: "" });
  }, []);

  async function saveDisplayName() {
    const name = modalValue.trim();
    if (!name) {
      setModalError("Display name cannot be empty.");
      return;
    }
    setModalBusy(true);
    setModalError("");
    try {
      const res = await fetch(`${API_BASE_URL}/auth/update-profile`, {
        method: "POST",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(settingsFormatApiError(data?.detail, "Could not save display name."));
      await refreshUser();
      setProfile((prev) => (prev ? { ...prev, display_name: name } : prev));
      closeModal();
    } catch (e) {
      setModalError(e.message || "Save failed.");
    } finally {
      setModalBusy(false);
    }
  }

  async function saveParentEmail() {
    const trimmed = modalValue.trim();
    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setModalError("Please enter a valid email address.");
      return;
    }
    setModalBusy(true);
    setModalError("");
    try {
      const res = await fetch(`${API_BASE_URL}/auth/update-profile`, {
        method: "POST",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({ parent_email: trimmed || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(settingsFormatApiError(data?.detail, "Could not save notification email."));
      setProfile((prev) => (prev ? { ...prev, parent_email: trimmed || null } : prev));
      closeModal();
    } catch (e) {
      setModalError(e.message || "Save failed.");
    } finally {
      setModalBusy(false);
    }
  }

  async function savePassword() {
    if (passwordForm.next.length < 8) {
      setModalError("New password must be at least 8 characters.");
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setModalError("Passwords do not match.");
      return;
    }
    setModalBusy(true);
    setModalError("");
    try {
      const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: "POST",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: passwordForm.current,
          new_password: passwordForm.next,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(settingsFormatApiError(data?.detail, "Could not change password."));
      closeModal();
    } catch (e) {
      setModalError(e.message || "Save failed.");
    } finally {
      setModalBusy(false);
    }
  }

  async function deleteAccount() {
    if (deleteConfirm !== "DELETE") {
      setModalError('Type "DELETE" to confirm.');
      return;
    }
    setModalBusy(true);
    setModalError("");
    try {
      const res = await fetch(`${API_BASE_URL}/auth/account`, {
        method: "DELETE",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: deleteConfirm }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(settingsFormatApiError(data?.detail, "Could not delete account."));
      performLogout(logout);
    } catch (e) {
      setModalError(e.message || "Delete failed.");
    } finally {
      setModalBusy(false);
    }
  }

  if (!initializing && !user) {
    return <Navigate to="/login" replace />;
  }

  const displayName = profile?.display_name || user?.display_name || "—";
  const email = profile?.email || user?.email || "";
  const parentEmail = profile?.parent_email || null;
  const stripeConnected =
    profile?.stripe_onboarding_complete && profile?.stripe_payouts_enabled;

  return (
    <div className="min-h-screen bg-appBg text-slate-100">
      <AppHeader />

      <main className="settings-page">
        <div className="settings-page__header">
          <button type="button" className="settings-page__back" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>
          <div>
            <h1 className="settings-page__title">Settings</h1>
            <p className="settings-page__subtitle">Customize your experience</p>
          </div>
        </div>

        {!settingsLoaded ? (
          <div className="settings-page__loading">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-[var(--color-gold-primary)]" />
          </div>
        ) : (
          <>
            <SettingsSection label="Display">
              <SettingsToggleRow
                label="Autoplay card videos"
                description="Videos play automatically as you scroll through cards"
                checked={settings.autoplay_videos}
                onChange={(v) => updateSetting("autoplay_videos", v)}
              />
              <SettingsToggleRow
                label="Show card prices in collection"
                description="Display current market value on your cards"
                checked={settings.show_prices}
                onChange={(v) => updateSetting("show_prices", v)}
              />
              <SettingsSelectRow
                label="Default card tier"
                description="Pre-select this tier when creating a new card"
                value={settings.default_tier || DEFAULT_SETTINGS.default_tier}
                options={TIER_OPTIONS}
                onChange={(v) => updateSetting("default_tier", v)}
              />
              <SettingsSelectRow
                label="Default card theme"
                description="Your favorite theme pre-selected in Studio"
                value={settings.default_theme || ""}
                options={themeOptions.map((o) => ({ value: o.value ?? "", label: o.label }))}
                onChange={(v) => updateSetting("default_theme", v || null)}
              />
            </SettingsSection>

            <SettingsSection label="Notifications">
              <SettingsToggleRow
                label="Offer accepted emails"
                description="Email me when someone accepts my offer"
                checked={settings.email_offer_accepted}
                onChange={(v) => updateSetting("email_offer_accepted", v)}
              />
              <SettingsToggleRow
                label="New offer emails"
                description="Email me when someone makes an offer on my listing"
                checked={settings.email_new_offer}
                onChange={(v) => updateSetting("email_new_offer", v)}
              />
              <SettingsToggleRow
                label="Animation ready emails"
                description="Email me when my animated card is ready"
                checked={settings.email_animation_ready}
                onChange={(v) => updateSetting("email_animation_ready", v)}
              />
              <SettingsToggleRow
                label="Trade request emails"
                description="Email me when someone sends me a trade request"
                checked={settings.email_trade_request}
                onChange={(v) => updateSetting("email_trade_request", v)}
              />
              <SettingsToggleRow
                label="Weekly summary emails"
                description="Weekly recap of your collection activity"
                checked={settings.email_weekly_summary}
                onChange={(v) => updateSetting("email_weekly_summary", v)}
              />
            </SettingsSection>

            <SettingsSection label="Privacy">
              <SettingsToggleRow
                label="Public collection"
                description="Show my cards in the public Vault for others to browse"
                checked={settings.public_collection}
                onChange={(v) => updateSetting("public_collection", v)}
              />
              <SettingsToggleRow
                label="Show in trade leaderboard"
                description="Appear in platform trading activity stats"
                checked={settings.show_in_leaderboard}
                onChange={(v) => updateSetting("show_in_leaderboard", v)}
              />
            </SettingsSection>

            <SettingsSection label="Account">
              <SettingsLinkRow
                label="Display Name"
                value={displayName}
                onClick={() => {
                  setModal("display_name");
                  setModalValue(displayName === "—" ? "" : displayName);
                }}
              />
              <SettingsLinkRow
                label="Email Address"
                value={maskEmail(email)}
                onClick={() => setModal("email_info")}
              />
              <SettingsLinkRow
                label="Change Password"
                onClick={() => setModal("password")}
              />
              <SettingsLinkRow
                label="Connected Bank Account"
                value={stripeConnected ? "Connected" : "Not connected"}
                to="/profile#payout-settings"
              />
              <SettingsLinkRow
                label="Notification Email"
                value={parentEmail || "Not set"}
                onClick={() => {
                  setModal("parent_email");
                  setModalValue(parentEmail || "");
                }}
              />
            </SettingsSection>

            <section className="settings-section settings-section--account-actions">
              <button
                type="button"
                className="settings-logout-btn"
                onClick={() => setModal("logout")}
              >
                Log Out
              </button>
              <div className="settings-account-divider" aria-hidden />
              <SettingsLinkRow
                label="Delete Account"
                danger
                onClick={() => setModal("delete")}
              />
            </section>

            <section className="settings-section">
              <h2 className="settings-section__label">Support</h2>
              <div className="settings-section__rows">
                <SettingsLinkRow label="Help Center" description="Browse FAQs and guides" to="/help" />
                <SettingsLinkRow label="Contact Us" description="Get in touch with our team" to="/contact" />
              </div>
            </section>
          </>
        )}
      </main>

      <AppFooter />

      {modal === "display_name" ? (
        <SimpleModal title="Edit Display Name" onClose={closeModal}>
          <div className="settings-modal__field">
            <label className="settings-modal__label">
              <User className="h-4 w-4" aria-hidden /> Display Name
            </label>
            <input
              type="text"
              value={modalValue}
              onChange={(e) => setModalValue(e.target.value)}
              className="settings-modal__input"
              autoFocus
            />
          </div>
          {modalError ? <p className="settings-modal__error">{modalError}</p> : null}
          <div className="settings-modal__actions">
            <button type="button" className="btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button type="button" className="btn-primary" disabled={modalBusy} onClick={saveDisplayName}>
              {modalBusy ? "Saving…" : "Save"}
            </button>
          </div>
        </SimpleModal>
      ) : null}

      {modal === "parent_email" ? (
        <SimpleModal title="Notification Email" onClose={closeModal}>
          <div className="settings-modal__field">
            <label className="settings-modal__label">
              <Mail className="h-4 w-4" aria-hidden /> Parent or Guardian Email
            </label>
            <input
              type="email"
              value={modalValue}
              onChange={(e) => setModalValue(e.target.value)}
              placeholder="parent@email.com"
              className="settings-modal__input"
              autoFocus
            />
            <p className="settings-modal__hint">
              Optional — receives copies of important account notifications.
            </p>
          </div>
          {modalError ? <p className="settings-modal__error">{modalError}</p> : null}
          <div className="settings-modal__actions">
            <button type="button" className="btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button type="button" className="btn-primary" disabled={modalBusy} onClick={saveParentEmail}>
              {modalBusy ? "Saving…" : "Save"}
            </button>
          </div>
        </SimpleModal>
      ) : null}

      {modal === "email_info" ? (
        <SimpleModal title="Email Address" onClose={closeModal}>
          <p className="settings-modal__hint">
            Your email is <strong>{email}</strong>. Email changes require verification — contact support to update
            your address.
          </p>
          <div className="settings-modal__actions">
            <button type="button" className="btn-primary" onClick={closeModal}>
              OK
            </button>
          </div>
        </SimpleModal>
      ) : null}

      {modal === "password" ? (
        <SimpleModal title="Change Password" onClose={closeModal}>
          <div className="settings-modal__field">
            <label className="settings-modal__label">Current password</label>
            <input
              type="password"
              value={passwordForm.current}
              onChange={(e) => setPasswordForm((p) => ({ ...p, current: e.target.value }))}
              className="settings-modal__input"
              autoComplete="current-password"
            />
          </div>
          <div className="settings-modal__field">
            <label className="settings-modal__label">New password</label>
            <input
              type="password"
              value={passwordForm.next}
              onChange={(e) => setPasswordForm((p) => ({ ...p, next: e.target.value }))}
              className="settings-modal__input"
              autoComplete="new-password"
            />
          </div>
          <div className="settings-modal__field">
            <label className="settings-modal__label">Confirm new password</label>
            <input
              type="password"
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))}
              className="settings-modal__input"
              autoComplete="new-password"
            />
          </div>
          {modalError ? <p className="settings-modal__error">{modalError}</p> : null}
          <div className="settings-modal__actions">
            <button type="button" className="btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button type="button" className="btn-primary" disabled={modalBusy} onClick={savePassword}>
              {modalBusy ? "Saving…" : "Update Password"}
            </button>
          </div>
        </SimpleModal>
      ) : null}

      {modal === "logout" ? (
        <LogoutConfirmModal
          onClose={closeModal}
          onConfirm={() => performLogout(logout)}
        />
      ) : null}

      {modal === "delete" ? (
        <SimpleModal title="Delete Account" onClose={closeModal}>
          <p className="settings-modal__hint settings-modal__hint--danger">
            Are you sure? This will permanently delete your account and all your cards. This cannot be undone.
          </p>
          <div className="settings-modal__field">
            <label className="settings-modal__label">
              <Trash2 className="h-4 w-4" aria-hidden /> Type DELETE to confirm
            </label>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="settings-modal__input"
              placeholder="DELETE"
              autoFocus
            />
          </div>
          {modalError ? <p className="settings-modal__error">{modalError}</p> : null}
          <div className="settings-modal__actions">
            <button type="button" className="btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button
              type="button"
              className="settings-modal__delete-btn"
              disabled={modalBusy || deleteConfirm !== "DELETE"}
              onClick={deleteAccount}
            >
              {modalBusy ? "Deleting…" : "Delete Account"}
            </button>
          </div>
        </SimpleModal>
      ) : null}
    </div>
  );
}
