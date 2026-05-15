import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function MarketplaceSubNav() {
  const { user, initializing } = useAuth();
  const location = useLocation();

  const links = [{ to: "/marketplace", label: "Browse", exact: true }];
  if (!initializing && user) {
    links.push(
      { to: "/marketplace/my-listings", label: "My Listings" },
      { to: "/marketplace/my-offers", label: "My Offers" }
    );
  }

  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-white/10 pb-3">
      {links.map(({ to, label, exact }) => {
        const active = exact ? location.pathname === to : location.pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              active ? "bg-teal-500/20 text-neonTeal" : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
