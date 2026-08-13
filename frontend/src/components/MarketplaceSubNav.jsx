import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function MarketplaceSubNav() {
  const { user, initializing, pendingIncomingMarketplaceCount } = useAuth();
  const location = useLocation();

  const links = [{ to: "/marketplace", label: "Browse", exact: true }];
  if (!initializing && user) {
    links.push(
      { to: "/marketplace/my-listings", label: "My Listings", badge: true },
      { to: "/marketplace/my-offers", label: "My Offers" }
    );
  }

  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b divider-gold pb-3">
      {links.map(({ to, label, exact, badge }) => {
        const active = exact ? location.pathname === to : location.pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            className={`relative marketplace-tab px-3 py-1.5 text-sm font-medium ${active ? "marketplace-tab--active" : ""}`}
          >
            {label}
            {badge && pendingIncomingMarketplaceCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#ef4444] px-1 text-[10px] font-bold leading-none text-white shadow-sm">
                {pendingIncomingMarketplaceCount > 9 ? "9+" : pendingIncomingMarketplaceCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
