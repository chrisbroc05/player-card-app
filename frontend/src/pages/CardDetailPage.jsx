import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import { API_BASE_URL } from "../config/api";
import CardImage from "../components/CardImage";
import ShareCard from "../components/ShareCard";
import { useAuth } from "../context/AuthContext";
import { vaultTierBadge, formatEdition, rarityDisplay } from "../utils/tierStyles";

function formatCreatedAt(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function CardDetailPage() {
  const { cardId } = useParams();
  const { user } = useAuth();
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cardId) return;
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE_URL}/cards/${encodeURIComponent(cardId)}`);
        if (res.status === 404) {
          setError("Card not found.");
          setCard(null);
          return;
        }
        if (!res.ok) throw new Error("Could not load card.");
        const data = await res.json();
        if (!cancelled) setCard(data);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  const badge = card ? vaultTierBadge(card.tier) : null;

  return (
    <div className="min-h-screen overflow-x-hidden bg-appBg text-slate-100">
      <AppHeader />

      <main className="mx-auto w-full max-w-4xl px-3 py-8 sm:px-6 lg:px-8">
        <Link
          to={user ? "/my-collection" : "/"}
          className="mb-6 inline-flex items-center text-sm text-slate-400 transition hover:text-white"
        >
          {user ? "← Back to My Collection" : "← Back to Studio"}
        </Link>

        {loading ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/15 border-t-neonBlue" />
          </div>
        ) : error || !card ? (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-8 text-center text-rose-100">
            {error || "Card not found."}
          </div>
        ) : (
          <div className="animate-fadeUp">
            <div className="mx-auto max-w-lg">
              <div
                className={`animate-pulseGlow relative overflow-hidden rounded-2xl border-2 bg-black/40 p-1 ${badge?.glow ?? ""}`}
              >
                <CardImage
                  imageUrl={card.image_url}
                  alt={card.player_name}
                  cacheBust={card.created_at}
                  className="w-full rounded-xl object-cover shadow-2xl"
                />
              </div>
            </div>

            <div className="mx-auto mt-10 max-w-xl space-y-6 text-center sm:text-left">
              <div>
                <h1 className="text-2xl font-bold text-white sm:text-3xl">{card.player_name}</h1>
                <p className="mt-1 text-slate-400">{card.team_name}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badge?.pill ?? ""}`}>
                  {badge?.label}
                </span>
                <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-slate-300">
                  {rarityDisplay(card.rarity)}
                </span>
              </div>

              <dl className="grid gap-3 rounded-2xl border border-white/10 bg-cardBg p-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Position</dt>
                  <dd className="font-medium text-white">{card.position || "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Jersey #</dt>
                  <dd className="font-medium text-white">{card.jersey_number || "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Grad year</dt>
                  <dd className="font-medium text-white">{card.grad_year}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Theme</dt>
                  <dd className="font-medium text-white capitalize">{card.theme || "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-slate-500">Card ID</dt>
                  <dd className="font-mono text-xs text-neonTeal">{card.card_id}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-slate-500">Edition</dt>
                  <dd className="font-medium text-white">{formatEdition(card.edition_number, card.print_run)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-slate-500">Created</dt>
                  <dd className="text-slate-200">{formatCreatedAt(card.created_at)}</dd>
                </div>
              </dl>

              <ShareCard card={card} sectionTitle="Share This Card" />

              <div className="flex justify-center sm:justify-start">
                <Link
                  to={user ? "/my-collection" : "/"}
                  className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/20 bg-cardBg2 px-6 py-2.5 text-sm font-medium text-slate-100 transition hover:border-neonBlue/40 hover:text-white"
                >
                  {user ? "Back to My Collection" : "Back to Studio"}
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      <AppFooter />
    </div>
  );
}
