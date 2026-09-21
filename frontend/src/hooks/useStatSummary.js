import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL, authHeaders } from "../config/api";
import { formatApiError } from "../utils/authFetch";

export function useStatSummary(token, period) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStats = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/stats/summary?period=${encodeURIComponent(period)}`, {
        headers: { ...authHeaders(token) },
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Could not load stats."));
      setStats(data);
    } catch (e) {
      setError(e.message || "Could not load stats.");
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [token, period]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return { stats, loading, error, reload: loadStats };
}
