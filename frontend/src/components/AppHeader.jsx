import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, Coins } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { formatMoney } from "../utils/marketplace";
import MobileBottomNav from "./MobileBottomNav";

/** Set to false to hide the logo mark and show text-only branding on all screen sizes. */
const SHOW_LOGO_MARK = true;

function useHideMobileChrome() {
  const { pathname } = useLocation();
  return pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/admin");
}

export default function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, initializing, pendingIncomingTradesCount, pendingIncomingMarketplaceCount } =
    useAuth();
  const hideMobileChrome = useHideMobileChrome();
  const showMobileNav = Boolean(user) && !hideMobileChrome;

  const onStudio = location.pathname === "/" || location.pathname.startsWith("/studio");
  const onVault = location.pathname.startsWith("/my-collection") || location.pathname === "/vault";
  const onMarketplace = location.pathname.startsWith("/marketplace");
  const onMyCollection = location.pathname.startsWith("/my-collection");
  const onTrades = location.pathname.startsWith("/trades");
  const onProfile = location.pathname.startsWith("/profile");
  const onCredits = location.pathname.startsWith("/credits");

  const hasNotifications = pendingIncomingTradesCount + pendingIncomingMarketplaceCount > 0;

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  function navClass(active) {
    return `app-nav-link desktop-nav-links px-3 py-2 text-xs font-medium sm:text-sm ${active ? "app-nav-link--active" : ""}`;
  }

  const brandClass = SHOW_LOGO_MARK ? "app-header-brand app-header-brand--show-mark" : "app-header-brand";

  return (
    <>
      <header className="app-header desktop-header backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <Link to="/" className={brandClass} aria-label="Prospect Legends home">
            {SHOW_LOGO_MARK ? (
              <img
                src="/prospect-legends-logo.png"
                alt=""
                aria-hidden
                className="app-header-brand__mark"
                height={36}
              />
            ) : null}
            <span className="app-header-brand__text">
              <span className="app-header-brand__title">Prospect Legends</span>
              <span className="app-header-brand__tagline">Digital Collectible Cards</span>
            </span>
          </Link>
          <nav className="desktop-nav-tabs flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <Link to="/" className={navClass(onStudio)}>
              Studio
            </Link>
            {!initializing && !user ? (
              <Link to="/my-collection" className={navClass(onVault && !onMarketplace)}>
                Vault
              </Link>
            ) : null}
            {!initializing ? (
              <Link to="/marketplace" className={`relative ${navClass(onMarketplace)}`}>
                Free Agency Marketplace
                {user && pendingIncomingMarketplaceCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#ef4444] px-1 text-[10px] font-bold leading-none text-white shadow-sm">
                    {pendingIncomingMarketplaceCount > 9 ? "9+" : pendingIncomingMarketplaceCount}
                  </span>
                ) : null}
              </Link>
            ) : null}
            {!initializing && user ? (
              <>
                <Link to="/my-collection" className={navClass(onMyCollection)}>
                  My Collection
                </Link>
                <Link to="/trades" className={`relative ${navClass(onTrades)}`}>
                  Trades
                  {pendingIncomingTradesCount > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#ef4444] px-1 text-[10px] font-bold leading-none text-white shadow-sm">
                      {pendingIncomingTradesCount > 9 ? "9+" : pendingIncomingTradesCount}
                    </span>
                  ) : null}
                </Link>
                <Link
                  to="/credits"
                  className={`credit-badge inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition sm:text-sm ${
                    onCredits ? "surface-card--selected" : ""
                  }`}
                  title="Your credit balance"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 12m15 0v3a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15v-3"
                    />
                  </svg>
                  <span className="tabular-nums">{formatMoney(user.credit_balance ?? 0)}</span>
                </Link>
                <Link
                  to="/profile"
                  className={`inline-flex max-w-[140px] truncate text-xs text-[var(--color-text-secondary)] underline decoration-transparent underline-offset-2 transition hover:text-white hover:decoration-white/40 sm:max-w-[200px] ${
                    onProfile ? "text-white decoration-white/30" : ""
                  }`}
                >
                  {user.display_name}
                </Link>
                <button type="button" onClick={handleLogout} className="btn-secondary px-3 py-2 text-xs sm:text-sm">
                  Logout
                </button>
              </>
            ) : !initializing ? (
              <>
                <Link to="/register" className="btn-secondary px-3 py-2 text-xs sm:text-sm">
                  Sign Up
                </Link>
                <Link to="/login" className="btn-primary inline-flex px-3 py-2 text-xs sm:text-sm">
                  Login
                </Link>
              </>
            ) : null}
          </nav>
        </div>
      </header>

      {!hideMobileChrome ? (
        <header className="mobile-header">
          <div className="mobile-header-left">
            <Link to="/" className="mobile-header__logo-link" aria-label="Prospect Legends home">
              <img src="/prospect-legends-logo.png" alt="" className="mobile-header__logo" height={28} />
            </Link>
            {user ? (
              <Link to="/profile" className="mobile-header__username" title={user.display_name}>
                @{user.display_name}
              </Link>
            ) : null}
          </div>

          <div className="mobile-header-right">
            {user ? (
              <>
                <Link to="/credits" className="credits-badge" title="Your credit balance">
                  <Coins className="credits-badge__icon" strokeWidth={2} aria-hidden />
                  <span className="credits-badge__amount tabular-nums">{formatMoney(user.credit_balance ?? 0)}</span>
                </Link>
                <Link
                  to="/trades"
                  className={`mobile-header__bell${hasNotifications ? " mobile-header__bell--active" : ""}`}
                  aria-label={hasNotifications ? "Trades and offers — new activity" : "Trades and offers"}
                >
                  <Bell className="h-5 w-5" strokeWidth={2} aria-hidden />
                  {hasNotifications ? <span className="notification-dot" aria-hidden /> : null}
                </Link>
              </>
            ) : (
              <Link to="/login" className="mobile-header__sign-in text-xs font-medium text-brand-gold">
                Sign in
              </Link>
            )}
          </div>
        </header>
      ) : null}

      {showMobileNav ? <MobileBottomNav /> : null}
    </>
  );
}
