import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatMoney } from "../utils/marketplace";

export default function AppHeader() {
  const location = useLocation();
  const { user, logout, initializing, pendingIncomingTradesCount, pendingIncomingMarketplaceCount } =
    useAuth();
  const onStudio = location.pathname === "/";
  const onVault = location.pathname.startsWith("/my-collection") || location.pathname === "/vault";
  const onMarketplace = location.pathname.startsWith("/marketplace");
  const onMyCollection = location.pathname.startsWith("/my-collection");
  const onTrades = location.pathname.startsWith("/trades");
  const onProfile = location.pathname.startsWith("/profile");
  const onCredits = location.pathname.startsWith("/credits");

  return (
    <header className="border-b border-white/10 bg-cardBg/50 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <Link to="/" className="text-left transition hover:opacity-90">
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-slate-500">Future Legends</p>
          <h1 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
            Card<span className="text-neonBlue">Studio</span>
          </h1>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <Link
            to="/"
            className={`rounded-lg px-3 py-2 text-xs font-medium transition sm:text-sm ${
              onStudio ? "bg-neonBlue/20 text-neonBlue" : "text-slate-400 hover:text-white"
            }`}
          >
            Studio
          </Link>
          {!initializing && !user ? (
            <Link
              to="/my-collection"
              className={`rounded-lg px-3 py-2 text-xs font-medium transition sm:text-sm ${
                onVault && !onMarketplace ? "bg-violet-500/20 text-violet-200" : "text-slate-400 hover:text-white"
              }`}
            >
              Vault
            </Link>
          ) : null}
          {!initializing ? (
            <Link
              to="/marketplace"
              className={`relative rounded-lg px-3 py-2 text-xs font-medium transition sm:text-sm ${
                onMarketplace ? "bg-teal-500/20 text-neonTeal" : "text-slate-400 hover:text-white"
              }`}
            >
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
              <Link
                to="/my-collection"
                className={`rounded-lg px-3 py-2 text-xs font-medium transition sm:text-sm ${
                  onMyCollection ? "bg-violet-500/20 text-violet-200" : "text-slate-400 hover:text-white"
                }`}
              >
                My Collection
              </Link>
              <Link
                to="/trades"
                className={`relative rounded-lg px-3 py-2 text-xs font-medium transition sm:text-sm ${
                  onTrades ? "bg-amber-500/20 text-amber-100" : "text-slate-400 hover:text-white"
                }`}
              >
                Trades
                {pendingIncomingTradesCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#ef4444] px-1 text-[10px] font-bold leading-none text-white shadow-sm">
                    {pendingIncomingTradesCount > 9 ? "9+" : pendingIncomingTradesCount}
                  </span>
                ) : null}
              </Link>
              <Link
                to="/credits"
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition sm:text-sm ${
                  onCredits
                    ? "border-teal-500/40 bg-teal-500/15 text-neonTeal"
                    : "border-white/15 text-slate-300 hover:border-teal-500/30 hover:text-white"
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
                className={`inline-flex max-w-[140px] truncate text-xs text-slate-300 underline decoration-transparent underline-offset-2 transition hover:text-white hover:decoration-white/40 sm:max-w-[200px] ${
                  onProfile ? "text-white decoration-white/30" : ""
                }`}
              >
                {user.display_name}
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                className="rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-white/30 hover:text-white sm:text-sm"
              >
                Logout
              </button>
            </>
          ) : !initializing ? (
            <>
              <Link
                to="/register"
                className="rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-neonTeal/40 hover:text-white sm:text-sm"
              >
                Sign Up
              </Link>
              <Link
                to="/login"
                className="rounded-lg bg-neonBlue/90 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-neonBlue sm:text-sm"
              >
                Login
              </Link>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
