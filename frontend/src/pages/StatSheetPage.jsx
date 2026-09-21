import React, { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import StatPeriodFilters from "../components/profile/StatPeriodFilters";
import StatSheetCards from "../components/profile/StatSheetCards";
import { useAuth } from "../context/AuthContext";
import { useStatSummary } from "../hooks/useStatSummary";
import { formatMoney } from "../utils/marketplace";

const CHART_TOOLTIP_STYLE = {
  background: "#1A1A1A",
  border: "1px solid rgba(201, 168, 76, 0.3)",
  borderRadius: 8,
  fontFamily: '"Barlow Condensed", sans-serif',
  fontSize: 13,
  color: "#ffffff",
};

function truncateName(name, max = 12) {
  const s = (name || "").trim();
  if (s.length <= max) return s || "Unknown";
  return `${s.slice(0, max)}…`;
}

function SpendingVsEarningsChart({ data, loading }) {
  const chartData = useMemo(
    () =>
      (Array.isArray(data) ? data : []).map((row) => ({
        month: row.month,
        earnings: Number(row.earnings) || 0,
        spending: Number(row.spending) || 0,
      })),
    [data]
  );

  return (
    <section className="stat-sheet-chart-card">
      <h3 className="stat-sheet-chart-card__title">Spending vs Earnings</h3>
      {loading ? (
        <p className="stat-sheet-chart-card__loading">Loading chart…</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(value, name) => [
                  formatMoney(value),
                  name === "earnings" ? "Earnings" : "Spending",
                ]}
                labelFormatter={(label) => `Month: ${label}`}
              />
              <Bar dataKey="earnings" fill="#4CAF50" radius={[4, 4, 0, 0]} maxBarSize={18} />
              <Bar dataKey="spending" fill="rgba(239,83,80,0.7)" radius={[4, 4, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
          <p className="stat-sheet-chart-card__legend">🟢 Earnings &nbsp; 🔴 Spending</p>
        </>
      )}
    </section>
  );
}

function CardActivityChart({ data, loading }) {
  const chartData = useMemo(
    () =>
      (Array.isArray(data) ? data : []).map((row) => ({
        month: row.month,
        cards_created: Number(row.cards_created) || 0,
      })),
    [data]
  );

  return (
    <section className="stat-sheet-chart-card">
      <h3 className="stat-sheet-chart-card__title">Card Activity</h3>
      {loading ? (
        <p className="stat-sheet-chart-card__loading">Loading chart…</p>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              formatter={(value) => [value, "Cards Created"]}
              labelFormatter={(label) => `${label}`}
            />
            <Line
              type="monotone"
              dataKey="cards_created"
              stroke="#C9A84C"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#C9A84C", stroke: "#C9A84C" }}
              activeDot={{ r: 5, fill: "#E8C56A", stroke: "#C9A84C" }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}

function TopSalesChart({ sales, loading }) {
  const chartData = useMemo(
    () =>
      (Array.isArray(sales) ? sales : []).map((row) => ({
        name: truncateName(row.player_name),
        sale_price: Number(row.sale_price) || 0,
        fullName: row.player_name || "Unknown",
      })),
    [sales]
  );

  const hasSales = chartData.length > 0;

  return (
    <section className="stat-sheet-chart-card">
      <h3 className="stat-sheet-chart-card__title">Your Best Sales</h3>
      {loading ? (
        <p className="stat-sheet-chart-card__loading">Loading chart…</p>
      ) : !hasSales ? (
        <p className="stat-sheet-chart-card__empty">
          No sales yet — list your cards on the marketplace to get started
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
          >
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis
              type="category"
              dataKey="name"
              width={72}
              tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              formatter={(value) => [formatMoney(value), "Sale Price"]}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ""}
            />
            <defs>
              <linearGradient id="statSheetGoldGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#C9A84C" />
                <stop offset="100%" stopColor="#E8C56A" />
              </linearGradient>
            </defs>
            <Bar dataKey="sale_price" radius={[0, 4, 4, 0]} maxBarSize={16}>
              {chartData.map((entry) => (
                <Cell key={entry.fullName} fill="url(#statSheetGoldGradient)" />
              ))}
              <LabelList
                dataKey="sale_price"
                position="right"
                formatter={(v) => formatMoney(v)}
                fill="rgba(255,255,255,0.7)"
                fontSize={11}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}

export default function StatSheetPage() {
  const navigate = useNavigate();
  const { token, user, initializing } = useAuth();
  const [period, setPeriod] = useState("this_month");
  const { stats, loading, error } = useStatSummary(token, period);

  if (!initializing && !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-appBg text-slate-100 page-slide-in-right">
      <AppHeader />

      <main className="stat-sheet-page">
        <header className="stat-sheet-page__header">
          <button
            type="button"
            className="stat-sheet-page__back"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>
          <h1 className="stat-sheet-page__title">My Stat Sheet</h1>
          <span className="stat-sheet-page__header-spacer" aria-hidden />
        </header>

        <StatPeriodFilters period={period} onChange={setPeriod} className="stat-sheet-page__filters" />
        {error ? <p className="profile-stat-sheet__error">{error}</p> : null}

        <StatSheetCards stats={stats} loading={loading} />

        <SpendingVsEarningsChart data={stats?.monthly_data} loading={loading} />
        <CardActivityChart data={stats?.monthly_data} loading={loading} />
        <TopSalesChart sales={stats?.top_sales} loading={loading} />
      </main>

      <AppFooter />
    </div>
  );
}
