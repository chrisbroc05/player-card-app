import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function AppHeader() {
  const location = useLocation();
  const onVault = location.pathname.startsWith("/vault");
  const onStudio = location.pathname === "/";

  return (
    <header className="border-b border-white/10 bg-cardBg/50 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <Link to="/" className="text-left transition hover:opacity-90">
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-slate-500">Future Legends</p>
          <h1 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
            Card<span className="text-neonBlue">Vault</span>
          </h1>
        </Link>
        <nav className="flex flex-wrap items-center gap-2">
          <Link
            to="/"
            className={`rounded-lg px-3 py-2 text-xs font-medium transition sm:text-sm ${
              onStudio ? "bg-neonBlue/20 text-neonBlue" : "text-slate-400 hover:text-white"
            }`}
          >
            Studio
          </Link>
          <Link
            to="/vault"
            className={`rounded-lg px-3 py-2 text-xs font-medium transition sm:text-sm ${
              onVault ? "bg-neonTeal/20 text-neonTeal" : "text-slate-400 hover:text-white"
            }`}
          >
            Card Vault
          </Link>
        </nav>
      </div>
    </header>
  );
}
