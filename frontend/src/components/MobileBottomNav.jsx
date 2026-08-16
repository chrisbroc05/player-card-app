import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutGrid, ShoppingBag, Sparkles, User } from "lucide-react";

const TABS = [
  { route: "/studio", match: (path) => path === "/" || path.startsWith("/studio"), label: "Studio", Icon: Sparkles },
  { route: "/marketplace", match: (path) => path.startsWith("/marketplace"), label: "Marketplace", Icon: ShoppingBag },
  {
    route: "/my-collection",
    match: (path) => path.startsWith("/my-collection"),
    label: "Collection",
    Icon: LayoutGrid,
  },
  { route: "/profile", match: (path) => path === "/profile" || path === "/profile/", label: "Profile", Icon: User },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <nav className="mobile-bottom-nav" aria-label="Main navigation">
      <div className="mobile-nav-pill">
        {TABS.map(({ route, match, label, Icon }) => {
          const active = match(pathname);
          return (
            <Link
              key={route}
              to={route}
              className={`mobile-nav-item${active ? " active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
              <span className="mobile-nav-item__label">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
