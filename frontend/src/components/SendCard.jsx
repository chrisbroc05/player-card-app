import React, { useState } from "react";
import { API_BASE_URL, authHeaders } from "../config/api";
import { useAuth } from "../context/AuthContext";

export default function SendCard({ card, onSent, onCancelTrade }) {
  const { token, refreshIncomingTradeCount } = useAuth();
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!token || !card?.card_id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/trades/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({
          card_id: card.card_id,
          recipient_identifier: recipient.trim(),
          message: message.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = data?.detail;
        const msg =
          typeof detail === "string"
            ? detail
            : Array.isArray(detail)
              ? detail.map((x) => x?.msg || x).join(" ")
              : "Could not send trade.";
        throw new Error(msg || "Could not send trade.");
      }
      const name = data?.recipient?.display_name || recipient.trim();
      setSuccess(`Card sent! Waiting for ${name} to accept.`);
      setRecipient("");
      setMessage("");
      if (onSent) onSent(data);
      refreshIncomingTradeCount?.();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!token || !card?.pending_trade_offer_id) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/trades/${card.pending_trade_offer_id}/cancel`, {
        method: "POST",
        headers: { ...authHeaders(token) },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = data?.detail;
        throw new Error(typeof detail === "string" ? detail : "Could not cancel trade.");
      }
      if (onCancelTrade) onCancelTrade(data);
      refreshIncomingTradeCount?.();
    } catch (err) {
      setError(err.message || "Cancel failed.");
    } finally {
      setLoading(false);
    }
  }

  if (card?.status === "pending_trade") {
    return (
      <section className="mt-8">
        <h2 className="mb-3 text-center text-sm font-semibold uppercase tracking-[0.18em] text-slate-400 sm:text-left">
          Send This Card
        </h2>
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-5 text-center sm:text-left">
          <p className="text-sm text-amber-100/95">This card is pending a trade offer.</p>
          <button
            type="button"
            disabled={loading}
            onClick={handleCancel}
            className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/20 bg-white/5 px-5 py-2 text-sm font-medium text-slate-200 transition hover:border-white/35 hover:bg-white/10 disabled:opacity-50"
          >
            {loading ? "Working…" : "Cancel Trade"}
          </button>
          {error ? <p className="mt-3 text-center text-xs text-rose-300 sm:text-left">{error}</p> : null}
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-center text-sm font-semibold uppercase tracking-[0.18em] text-slate-400 sm:text-left">
        Send This Card
      </h2>
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/10 bg-cardBg2/90 p-4 shadow-inner shadow-black/20 sm:p-5"
      >
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-400">
          Send to (email or display name)
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            required
            autoComplete="off"
            className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white outline-none ring-0 transition placeholder:text-slate-600 focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/30"
            placeholder="friend@email.com"
          />
        </label>
        <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-slate-400">
          Add a message (optional)
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="mt-1.5 w-full resize-y rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/30"
            placeholder="e.g. Great playing with you this season!"
          />
        </label>
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
        {success ? <p className="mt-3 text-sm text-emerald-300/95">{success}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="mt-5 inline-flex min-h-[46px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-amber-500/90 to-amber-600/90 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_24px_rgba(245,158,11,0.25)] transition hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 sm:w-auto"
        >
          {loading ? "Sending…" : "Send Card"}
        </button>
      </form>
    </section>
  );
}
