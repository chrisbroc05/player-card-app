import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AppHeader() {
  const location = useLocation();
  const { user, logout, initializing } = useAuth();
  const onStudio = location.pathname === "/";
  const onMyCollection = location.pathname.startsWith("/my-collection");

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
              <span className="hidden max-w-[140px] truncate text-xs text-slate-300 sm:inline sm:max-w-[200px]">
                {user.display_name}
              </span>
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
