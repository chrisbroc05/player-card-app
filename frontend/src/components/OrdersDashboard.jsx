import React from "react";
import { toApiUrl } from "../config/api";

const STATUS_OPTIONS = [
  "new_order",
  "awaiting_review",
  "in_design",
  "ready_for_delivery",
  "delivered",
  "completed",
];

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function chipClass(status) {
  switch (status) {
    case "delivered":
    case "completed":
      return "bg-emerald-400/15 text-emerald-200 border-emerald-300/30";
    case "ready_for_delivery":
      return "bg-cyan-400/15 text-cyan-200 border-cyan-300/30";
    case "in_design":
      return "bg-violet-400/15 text-violet-200 border-violet-300/30";
    case "awaiting_review":
      return "bg-amber-400/15 text-amber-200 border-amber-300/30";
    default:
      return "bg-slate-400/15 text-slate-200 border-slate-300/30";
  }
}

function orderPlayerName(order) {
  if (order.player_display_name) return order.player_display_name;
  const first = order.player_first_name || "";
  const last = order.player_last_name || "";
  const full = `${first} ${last}`.trim();
  return full || "Unknown Player";
}

export default function OrdersDashboard({
  orders,
  orderStatusDrafts,
  setOrderStatusDrafts,
  onUpdateStatus,
  onDeliver,
  activeActionKey,
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-cardBg p-5 shadow-xl shadow-black/30 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Orders Dashboard</h2>
        <span className="text-xs text-slate-400">{orders.length} order(s)</span>
      </div>

      {orders.length === 0 ? (
        <div className="flex min-h-[130px] items-center justify-center rounded-xl border border-dashed border-white/20 bg-cardBg2">
          <p className="text-sm text-slate-400">No orders yet. Create one from the Customer Checkout workspace.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-3">Player</th>
                <th className="px-3 py-3">Tier</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Final Card</th>
                <th className="px-3 py-3">Created</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-cardBg2/40">
              {orders.map((order) => (
                <tr key={order.id} className="align-top">
                  <td className="px-3 py-3">
                    <div className="font-medium text-slate-100">{orderPlayerName(order)}</div>
                    <div className="text-xs text-slate-400">Order #{order.id}</div>
                  </td>
                  <td className="px-3 py-3 text-slate-200">{order.tier}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full border px-2 py-1 text-xs ${chipClass(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-300">
                    {order.final_card_url ? (
                      <a
                        href={toApiUrl(order.final_card_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-neonBlue hover:underline"
                      >
                        View selected
                      </a>
                    ) : (
                      "Not selected yet"
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-300">{formatDate(order.created_at)}</td>
                  <td className="px-3 py-3">
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                      <select
                        value={orderStatusDrafts[order.id] || order.status}
                        onChange={(e) =>
                          setOrderStatusDrafts((prev) => ({
                            ...prev,
                            [order.id]: e.target.value,
                          }))
                        }
                        className="rounded-lg border border-white/15 bg-cardBg px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-neonBlue"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => onUpdateStatus(order.id)}
                        disabled={Boolean(activeActionKey)}
                        className="rounded-lg border border-neonBlue/40 bg-neonBlue/15 px-2.5 py-1.5 text-xs font-medium text-neonBlue disabled:opacity-50"
                      >
                        {activeActionKey === `status-${order.id}` ? "Saving..." : "Update"}
                      </button>

                      <button
                        onClick={() => onDeliver(order.id)}
                        disabled={Boolean(activeActionKey)}
                        className="rounded-lg border border-emerald-300/40 bg-emerald-400/15 px-2.5 py-1.5 text-xs font-medium text-emerald-200 disabled:opacity-50"
                      >
                        {activeActionKey === `deliver-${order.id}` ? "Delivering..." : "Deliver"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
