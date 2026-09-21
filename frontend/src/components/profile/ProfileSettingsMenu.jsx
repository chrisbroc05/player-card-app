import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  CreditCard,
  FileText,
  HelpCircle,
  History,
  Mail,
  Scale,
  Shield,
  Sparkles,
  User,
} from "lucide-react";

function SettingsGroup({ title, children }) {
  return (
    <section className="profile-settings-group">
      <h3 className="profile-settings-group__title">{title}</h3>
      <div className="profile-settings-group__rows">{children}</div>
    </section>
  );
}

function SettingsItem({ icon: Icon, label, to, href, onClick }) {
  const inner = (
    <>
      <span className="profile-settings-item__left">
        <Icon className="profile-settings-item__icon" aria-hidden />
        <span className="profile-settings-item__label">{label}</span>
      </span>
      <ArrowRight className="profile-settings-item__chevron" aria-hidden />
    </>
  );

  if (href) {
    return (
      <a href={href} className="profile-settings-item">
        {inner}
      </a>
    );
  }
  if (to) {
    return (
      <Link to={to} className="profile-settings-item">
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" className="profile-settings-item" onClick={onClick}>
      {inner}
    </button>
  );
}

export default function ProfileSettingsMenu() {
  return (
    <nav className="profile-settings-menu" aria-label="Profile settings">
      <SettingsGroup title="Account">
        <SettingsItem icon={User} label="Personal Information" to="/settings" />
        <SettingsItem icon={Shield} label="Login & Security" to="/settings" />
        <SettingsItem icon={Bell} label="Notification Preferences" to="/settings" />
        <SettingsItem icon={CreditCard} label="Linked Accounts (Stripe)" href="#payout-settings" />
      </SettingsGroup>

      <SettingsGroup title="Activity">
        <SettingsItem icon={History} label="Transaction History" href="#transaction-history" />
        <SettingsItem icon={BarChart3} label="My Stat Sheet" to="/profile/stats" />
        <SettingsItem icon={Sparkles} label="Collection Highlights" href="#collection-highlights" />
      </SettingsGroup>

      <SettingsGroup title="Help & Support">
        <SettingsItem icon={HelpCircle} label="Help Center" to="/help" />
        <SettingsItem icon={Mail} label="Contact Us" to="/contact" />
        <SettingsItem icon={BookOpen} label="How It Works" to="/help" />
      </SettingsGroup>

      <SettingsGroup title="Legal">
        <SettingsItem icon={FileText} label="Terms of Use" to="/terms" />
        <SettingsItem icon={Scale} label="Privacy Policy" to="/privacy" />
        <SettingsItem icon={FileText} label="Rules & Guidelines" to="/terms" />
      </SettingsGroup>
    </nav>
  );
}
