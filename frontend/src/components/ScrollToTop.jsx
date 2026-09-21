import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Scroll window to top on route pathname changes; leave hash-only navigation alone. */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
