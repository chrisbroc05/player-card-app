import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { API_BASE_URL, AUTH_TOKEN_STORAGE_KEY, authHeaders } from "../config/api";

function formatApiError(detail, fallback) {
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((item) => (typeof item === "string" ? item : item?.msg || null))
      .filter(Boolean);
    return msgs.length ? msgs.join(" | ") : fallback;
  }
  if (typeof detail === "object") {
    if (typeof detail.message === "string") return detail.message;
    if (typeof detail.msg === "string") return detail.msg;
  }
  return fallback;
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ?? "");
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [pendingIncomingTradesCount, setPendingIncomingTradesCount] = useState(0);

  const refreshIncomingTradeCount = useCallback(async (authToken) => {
    const t = (authToken ?? token ?? localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ?? "").trim();
    if (!t) {
      setPendingIncomingTradesCount(0);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/trades/incoming/count`, {
        headers: { ...authHeaders(t) },
      });
      if (!res.ok) return;
      const data = await res.json();
      setPendingIncomingTradesCount(Number(data?.count) || 0);
    } catch {
      setPendingIncomingTradesCount(0);
    }
  }, [token]);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    setToken("");
    setUser(null);
    setPendingIncomingTradesCount(0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      if (!t) {
        if (!cancelled) setInitializing(false);
        return;
      }
      if (!cancelled) setToken(t);
      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (!res.ok) {
          localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
          if (!cancelled) {
            setToken("");
            setUser(null);
          }
          return;
        }
        const data = await res.json();
        if (!cancelled) setUser(data);
      } catch {
        if (!cancelled) {
          localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
          setToken("");
          setUser(null);
        }
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (initializing) return;
    if (user && token) {
      refreshIncomingTradeCount(token);
    } else {
      setPendingIncomingTradesCount(0);
    }
  }, [user, token, initializing, refreshIncomingTradeCount]);

  const login = useCallback(
    async (email, password) => {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Invalid email or password"));
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, data.access_token);
      setToken(data.access_token);
      setUser(data.user);
      refreshIncomingTradeCount(data.access_token);
    },
    [refreshIncomingTradeCount]
  );

  const register = useCallback(
    async (email, displayName, password, inviteCode) => {
      const payload = {
        email: email.trim(),
        display_name: displayName.trim(),
        password,
      };
      if (inviteCode !== undefined) {
        payload.invite_code = inviteCode;
      }
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Registration failed"));
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, data.access_token);
      setToken(data.access_token);
      setUser(data.user);
      refreshIncomingTradeCount(data.access_token);
    },
    [refreshIncomingTradeCount]
  );

  const value = useMemo(
    () => ({
      token,
      user,
      initializing,
      pendingIncomingTradesCount,
      refreshIncomingTradeCount,
      login,
      logout,
      register,
    }),
    [
      token,
      user,
      initializing,
      pendingIncomingTradesCount,
      refreshIncomingTradeCount,
      login,
      logout,
      register,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
