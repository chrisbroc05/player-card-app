import React, { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import CardImage from "../components/CardImage";
import { API_BASE_URL, authHeaders } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { vaultTierBadge, formatEditionShort, rarityDisplay } from "../utils/tierStyles";
import { ActivityHistorySection } from "../components/ActivityHistory";

function relativeSentLabel(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 48) return `${h} hour${h === 1 ? "" : "s"} ago`;
    const days = Math.floor(h / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  } catch {
    return "";
  }
}

function tierImageGlow(tier) {
  const t = (tier || "").toLowerCase();
  if (t === "legends") return "shadow-[0_0_28px_rgba(255,215,0,0.35)] border-amber-400/50";
  if (t === "allstar") return "shadow-[0_0_26px_rgba(0,170,255,0.35)] border-cyan-400/50";
  return "shadow-[0_0_26px_rgba(255,69,0,0.35)] border-orange-500/50";
}

export default function TradesPage() {
  const { token, user, initializing, refreshIncomingTradeCount } = useAuth();
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionKey, setActionKey] = useState("");
  const [activityItems, setActivityItems] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState("");
  const [activityFilter, setActivityFilter] = useState("all");

  const loadActivity = useCallback(async () => {
    if (!token) return;
    setActivityLoading(true);
    setActivityError("");
    try {
      const res = await fetch(`${API_BASE_URL}/activity/history?limit=50`, {
        headers: { ...authHeaders(token) },
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data?.detail === "string" ? data.detail : "Could not load activity.");
      setActivityItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setActivityError(e.message || "Could not load activity.");
      setActivityItems([]);
    } finally {
      setActivityLoading(false);
    }
  }, [token]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [incRes, outRes] = await Promise.all([
        fetch(`${API_BASE_URL}/trades/incoming`, { headers: { ...authHeaders(token) } }),
        fetch(`${API_BASE_URL}/trades/outgoing`, { headers: { ...authHeaders(token) } }),
      ]);
      if (!incRes.ok || !outRes.ok) throw new Error("Could not load trades.");
      const inc = await incRes.json();
      const out = await outRes.json();
      setIncoming(Array.isArray(inc) ? inc : []);
      setOutgoing(Array.isArray(out) ? out : []);
    } catch (e) {
      setError(e.message || "Failed to load.");
    } finally {
      setLoading(false);
    }
    await loadActivity();
  }, [token, loadActivity]);

  useEffect(() => {
    if (!token || initializing) return;
    load();
  }, [token, initializing, load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#activity-history") {
      const el = document.getElementById("activity-history");
      if (el) {
        window.requestAnimationFrame(() => {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    }
  }, [loading, activityLoading]);

  async function postTradeAction(tradeId, path) {
    if (!token) return;
    const key = `${path}-${tradeId}`;
    setActionKey(key);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/trades/${tradeId}/${path}`, {
        method: "POST",
        headers: { ...authHeaders(token) },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data?.detail === "string" ? data.detail : "Request failed.");
      await load();
      refreshIncomingTradeCount?.();
    } catch (e) {
      setError(e.message || "Action failed.");
    } finally {
      setActionKey("");
    }
  }

  if (!initializing && !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-appBg text-slate-100">
      <AppHeader />

      <main className="mx-auto w-full max-w-5xl px-3 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Trades</h1>
          <p className="mt-2 text-sm text-slate-400">Incoming offers and cards you&apos;ve offered to others.</p>
        </div>

        {error ? (
          <div className="mb-6 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>
        ) : null}

        {initializing || loading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-neonBlue" />
          </div>
        ) : (
          <div className="space-y-12">
            <section>
              <h2 className="mb-4 border-b border-white/10 pb-2 text-lg font-semibold text-white">
                Cards Being Sent To You
              </h2>
              {incoming.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/15 bg-cardBg/40 px-4 py-10 text-center text-sm text-slate-500">
                  No incoming trade offers
                </p>
              ) : (
                <ul className="space-y-5">
                  {incoming.map((offer) => {
                    const c = offer.card || {};
                    const badge = vaultTierBadge(c.tier);
                    const rowBusy =
                      actionKey === `accept-${offer.id}` || actionKey === `decline-${offer.id}`;
                    return (
                      <li
                        key={offer.id}
                        className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-cardBg p-4 shadow-lg sm:flex-row sm:items-stretch"
                      >
                        <div
                          className={`mx-auto w-40 shrink-0 overflow-hidden rounded-xl border-2 bg-black/30 sm:mx-0 sm:w-44 ${tierImageGlow(c.tier)}`}
                        >
                          <CardImage
                            card={c}
                            alt={c.player_name}
                            cacheBust={c.created_at}
                            frameClassName="flex aspect-[2/3] w-full items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/30"
                          />
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <p className="text-lg font-semibold text-white">{c.player_name}</p>
                          <div className="flex flex-wrap gap-2">
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.pill}`}>
                              {badge.label}
                            </span>
                            <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-slate-300">
                              {rarityDisplay(c.rarity)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{formatEditionShort(c.edition_number, c.print_run)}</p>
                          <p className="text-sm text-slate-300">
                            From <span className="font-medium text-amber-100/95">{offer.sender?.display_name}</span>
                          </p>
                          {offer.message ? (
                            <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200">
                              {offer.message}
                            </p>
                          ) : null}
                          <p className="text-xs text-slate-500">{relativeSentLabel(offer.created_at)}</p>
                          <div className="flex flex-wrap gap-2 pt-2">
                            <button
                              type="button"
                              disabled={rowBusy}
                              onClick={() => postTradeAction(offer.id, "accept")}
                              className="inline-flex min-h-[42px] flex-1 items-center justify-center rounded-xl bg-emerald-500/90 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(34,197,94,0.35)] transition hover:bg-emerald-400 disabled:opacity-50 sm:flex-none"
                            >
                              {actionKey === `accept-${offer.id}` ? "…" : "Accept"}
                            </button>
                            <button
                              type="button"
                              disabled={rowBusy}
                              onClick={() => postTradeAction(offer.id, "decline")}
                              className="inline-flex min-h-[42px] flex-1 items-center justify-center rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-200/95 transition hover:border-rose-400/50 hover:bg-rose-500/15 disabled:opacity-50 sm:flex-none"
                            >
                              {actionKey === `decline-${offer.id}` ? "…" : "Decline"}
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section>
              <h2 className="mb-4 border-b border-white/10 pb-2 text-lg font-semibold text-white">Cards You&apos;re Sending</h2>
              {outgoing.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/15 bg-cardBg/40 px-4 py-10 text-center text-sm text-slate-500">
                  No outgoing trade offers
                </p>
              ) : (
                <ul className="space-y-5">
                  {outgoing.map((offer) => {
                    const c = offer.card || {};
                    const badge = vaultTierBadge(c.tier);
                    const rowBusy = actionKey === `cancel-${offer.id}`;
                    return (
                      <li
                        key={offer.id}
                        className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-cardBg p-4 shadow-lg sm:flex-row sm:items-stretch"
                      >
                        <div
                          className={`mx-auto w-40 shrink-0 overflow-hidden rounded-xl border-2 bg-black/30 sm:mx-0 sm:w-44 ${tierImageGlow(c.tier)}`}
                        >
                          <CardImage
                            card={c}
                            alt={c.player_name}
                            cacheBust={c.created_at}
                            frameClassName="flex aspect-[2/3] w-full items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/30"
                          />
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <p className="text-lg font-semibold text-white">{c.player_name}</p>
                          <div className="flex flex-wrap gap-2">
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.pill}`}>
                              {badge.label}
                            </span>
                            <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-slate-300">
                              {rarityDisplay(c.rarity)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{formatEditionShort(c.edition_number, c.print_run)}</p>
                          <p className="text-sm text-slate-300">
                            To <span className="font-medium text-cyan-100/90">{offer.recipient?.display_name}</span>
                          </p>
                          {offer.message ? (
                            <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-400">
                              Your message: {offer.message}
                            </p>
                          ) : null}
                          <p className="text-xs text-slate-500">{relativeSentLabel(offer.created_at)}</p>
                          <div className="pt-2">
                            <button
                              type="button"
                              disabled={rowBusy}
                              onClick={() => postTradeAction(offer.id, "cancel")}
                              className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/35 hover:bg-white/10 disabled:opacity-50"
                            >
                              {actionKey === `cancel-${offer.id}` ? "…" : "Cancel Trade"}
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <div id="activity-history">
              <ActivityHistorySection
                items={activityItems}
                loading={activityLoading}
                error={activityError}
                filter={activityFilter}
                onFilterChange={setActivityFilter}
              />
            </div>
          </div>
        )}

        <div className="mt-10">
          <Link to="/my-collection" className="text-sm text-slate-400 transition hover:text-white">
            ← Back to My Collection
          </Link>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
