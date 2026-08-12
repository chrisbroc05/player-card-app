import { useEffect, useState } from "react";

export function usePrefersHover() {
  const [canHover, setCanHover] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(hover: hover)").matches : true
  );

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover)");
    const fn = () => setCanHover(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  return canHover;
}

export function useIsMobileViewport() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const fn = () => setMobile(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return mobile;
}
