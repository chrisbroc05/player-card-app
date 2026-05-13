import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../config/api";

const FeatureContext = createContext(null);

export function FeatureProvider({ children }) {
  const [socialSharingEnabled, setSocialSharingEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/config/features`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && typeof data.social_sharing_enabled === "boolean") {
          setSocialSharingEnabled(data.social_sharing_enabled);
        }
      } catch {
        /* keep default true to match backend default */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => ({ socialSharingEnabled }), [socialSharingEnabled]);

  return <FeatureContext.Provider value={value}>{children}</FeatureContext.Provider>;
}

export function useFeatures() {
  const ctx = useContext(FeatureContext);
  if (!ctx) throw new Error("useFeatures must be used within FeatureProvider");
  return ctx;
}
