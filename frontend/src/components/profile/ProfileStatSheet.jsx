import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useStatSummary } from "../../hooks/useStatSummary";
import StatPeriodFilters from "./StatPeriodFilters";
import StatSheetCards from "./StatSheetCards";

export default function ProfileStatSheet({ token: tokenProp }) {
  const { token: authToken } = useAuth();
  const token = tokenProp || authToken;
  const [period, setPeriod] = useState("this_month");
  const { stats, loading, error } = useStatSummary(token, period);

  return (
    <section id="stat-sheet" className="profile-stat-sheet">
      <h2 className="profile-section-title">My Stat Sheet</h2>
      <StatPeriodFilters period={period} onChange={setPeriod} />
      {error ? <p className="profile-stat-sheet__error">{error}</p> : null}
      <StatSheetCards stats={stats} loading={loading} />
      <p className="profile-stat-sheet__view-all-wrap">
        <Link to="/profile/stats" className="profile-stat-sheet__view-all">
          View Full Stats →
        </Link>
      </p>
    </section>
  );
}
