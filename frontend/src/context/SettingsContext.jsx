import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL, authHeaders } from "../config/api";
import { useAuth } from "./AuthContext";

export const DEFAULT_SETTINGS = {
  autoplay_videos: true,
  large_card_grid: false,
  show_prices: true,
  default_tier: "all_star",
  default_theme: null,
  email_offer_accepted: true,
  email_new_offer: true,
  email_animation_ready: true,
  email_trade_request: true,
  email_weekly_summary: false,
  public_collection: true,
  show_in_leaderboard: true,
};

const SettingsContext = createContext(null);

function formatApiError(detail, fallback) {
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const msgs = detail.map((item) => (typeof item === "string" ? item : item?.msg || null)).filter(Boolean);
    return msgs.length ? msgs.join(" | ") : fallback;
  }
  return fallback;
}

export function SettingsProvider({ children }) {
  const { token, initializing } = useAuth();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const pendingPatchRef = useRef({});
  const saveTimerRef = useRef(null);

  const flushSave = useCallback(async () => {
    const patch = pendingPatchRef.current;
    pendingPatchRef.current = {};
    const keys = Object.keys(patch);
    if (!keys.length || !token) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/settings`, {
        method: "PUT",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSettings((prev) => ({ ...prev, ...data }));
      }
    } catch {
      /* keep optimistic local state */
    } finally {
      setSaving(false);
    }
  }, [token]);

  const scheduleSave = useCallback(
    (patch) => {
      pendingPatchRef.current = { ...pendingPatchRef.current, ...patch };
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = null;
        flushSave();
      }, 500);
    },
    [flushSave]
  );

  const updateSetting = useCallback(
    (key, value) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      scheduleSave({ [key]: value });
    },
    [scheduleSave]
  );

  const loadSettings = useCallback(async (authToken) => {
    const t = (authToken || "").trim();
    if (!t) {
      setSettings(DEFAULT_SETTINGS);
      setLoaded(true);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/settings`, {
        headers: { ...authHeaders(t) },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings({ ...DEFAULT_SETTINGS, ...data });
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
    } catch {
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (initializing) return;
    if (!token) {
      setSettings(DEFAULT_SETTINGS);
      setLoaded(true);
      return;
    }
    setLoaded(false);
    loadSettings(token);
  }, [token, initializing, loadSettings]);

  useEffect(
    () => () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    },
    []
  );

  const value = useMemo(
    () => ({
      settings,
      settingsLoaded: loaded,
      settingsSaving: saving,
      updateSetting,
      refreshSettings: () => loadSettings(token),
    }),
    [settings, loaded, saving, updateSetting, loadSettings, token]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

export { formatApiError as settingsFormatApiError };
