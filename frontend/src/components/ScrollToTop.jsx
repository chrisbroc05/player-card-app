import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Scroll window to top on route pathname changes; leave hash-only navigation alone. */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    if (hash) {
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
