import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE_URL, authHeaders } from "../config/api";
import { formatApiError } from "../utils/authFetch";

export function useStatSummary(token, selectedPeriod) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const periodRef = useRef(selectedPeriod);

  useEffect(() => {
    periodRef.current = selectedPeriod;
  }, [selectedPeriod]);

  const loadStats = useCallback(async () => {
    if (!token) return;
    const requestPeriod = selectedPeriod;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${API_BASE_URL}/stats/summary?period=${encodeURIComponent(requestPeriod)}`,
        {
          headers: { ...authHeaders(token) },
          cache: "no-store",
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Could not load stats."));
      if (periodRef.current !== requestPeriod) return;
      setStats(data);
    } catch (e) {
      if (periodRef.current !== requestPeriod) return;
      setError(e.message || "Could not load stats.");
    } finally {
      if (periodRef.current === requestPeriod) {
        setLoading(false);
      }
    }
  }, [token, selectedPeriod]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return { stats, loading, error, reload: loadStats };
}
