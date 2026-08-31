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
  const [pendingIncomingMarketplaceCount, setPendingIncomingMarketplaceCount] = useState(0);

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

  const refreshIncomingMarketplaceCount = useCallback(async (authToken) => {
    const t = (authToken ?? token ?? localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ?? "").trim();
    if (!t) {
      setPendingIncomingMarketplaceCount(0);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/marketplace/incoming-offers/count`, {
        headers: { ...authHeaders(t) },
      });
      if (!res.ok) return;
      const data = await res.json();
      setPendingIncomingMarketplaceCount(Number(data?.count) || 0);
    } catch {
      setPendingIncomingMarketplaceCount(0);
    }
  }, [token]);

  const refreshUser = useCallback(async (authToken) => {
    const t = (authToken ?? token ?? localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ?? "").trim();
    if (!t) {
      setUser(null);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { ...authHeaders(t) },
      });
      if (!res.ok) return;
      const data = await res.json();
      setUser(data);
    } catch {
      /* keep existing user on transient failure */
    }
  }, [token]);

  const refreshNavBadges = useCallback(
    async (authToken) => {
      const t = authToken ?? token;
      await Promise.all([refreshIncomingTradeCount(t), refreshIncomingMarketplaceCount(t), refreshUser(t)]);
    },
    [token, refreshIncomingTradeCount, refreshIncomingMarketplaceCount, refreshUser]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.clear();
    setToken("");
    setUser(null);
    setPendingIncomingTradesCount(0);
    setPendingIncomingMarketplaceCount(0);
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
    if (token) {
      refreshNavBadges(token);
    } else {
      setPendingIncomingTradesCount(0);
      setPendingIncomingMarketplaceCount(0);
    }
  }, [token, initializing, refreshNavBadges]);

  useEffect(() => {
    if (initializing || !token) return undefined;
    const id = window.setInterval(() => {
      refreshNavBadges(token);
    }, 60000);
    return () => window.clearInterval(id);
  }, [token, initializing, refreshNavBadges]);

  const applyAuthSession = useCallback(
    (accessToken, userData) => {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, accessToken);
      setToken(accessToken);
      setUser(userData);
      refreshNavBadges(accessToken);
    },
    [refreshNavBadges]
  );

  const login = useCallback(
    async (email, password) => {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Invalid email or password"));
      applyAuthSession(data.access_token, data.user);
    },
    [applyAuthSession]
  );

  const register = useCallback(
    async (email, displayName, password, inviteCode, parentEmail) => {
      const payload = {
        email: email.trim(),
        display_name: displayName.trim(),
        password,
      };
      if (inviteCode !== undefined) {
        payload.invite_code = inviteCode;
      }
      if (parentEmail) {
        payload.parent_email = parentEmail.trim();
      }
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Registration failed"));
      applyAuthSession(data.access_token, data.user);
    },
    [applyAuthSession]
  );

  const value = useMemo(
    () => ({
      token,
      user,
      initializing,
      pendingIncomingTradesCount,
      pendingIncomingMarketplaceCount,
      refreshIncomingTradeCount,
      refreshIncomingMarketplaceCount,
      refreshNavBadges,
      refreshUser,
      login,
      logout,
      register,
      applyAuthSession,
    }),
    [
      token,
      user,
      initializing,
      pendingIncomingTradesCount,
      pendingIncomingMarketplaceCount,
      refreshIncomingTradeCount,
      refreshIncomingMarketplaceCount,
      refreshNavBadges,
      refreshUser,
      login,
      logout,
      register,
      applyAuthSession,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
