import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../config/api";

function formatHistoryDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function EventIcon({ type }) {
  const t = (type || "").toLowerCase();
  const base = "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-cardBg2 text-sm";
  if (t === "created") {
    return (
      <span className={base} aria-hidden>
        ✦
      </span>
    );
  }
  if (t === "traded") {
    return (
      <span className={base} aria-hidden>
        ↔
      </span>
    );
  }
  if (t === "listed") {
    return (
      <span className={base} aria-hidden>
        🏷
      </span>
    );
  }
  if (t === "sold") {
    return (
      <span className={base} aria-hidden>
        ✓
      </span>
    );
  }
  return (
    <span className={base} aria-hidden>
      •
    </span>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <div className="h-8 w-8 rounded-full bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-white/10" />
            <div className="h-3 w-1/3 rounded bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CardHistoryTimeline({ cardId }) {
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!cardId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setFailed(false);
      try {
        const res = await fetch(`${API_BASE_URL}/cards/${encodeURIComponent(cardId)}/history`);
        if (!res.ok) {
          if (!cancelled) setFailed(true);
          return;
        }
        const data = await res.json();
        if (!cancelled) setEvents(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  if (failed) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-cardBg p-4 sm:p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Card History</h2>
      {loading ? (
        <div className="mt-4">
          <HistorySkeleton />
        </div>
      ) : !events?.length ? (
        <p className="mt-4 text-sm text-slate-500">No history recorded yet.</p>
      ) : (
        <ol className="relative mt-5 space-y-0">
          {events.map((ev, idx) => (
            <li key={`${ev.event_type}-${ev.event_date}-${idx}`} className="relative flex gap-3 pb-6 last:pb-0">
              {idx < events.length - 1 ? (
                <span
                  className="absolute left-4 top-8 bottom-0 w-px -translate-x-1/2 bg-white/10"
                  aria-hidden
                />
              ) : null}
              <EventIcon type={ev.event_type} />
              <EventBody ev={ev} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function EventBody({ ev }) {
  return (
    <div className="min-w-0 flex-1 pt-0.5">
      <p className="text-sm text-slate-200">{ev.description}</p>
      <p className="mt-1 text-xs text-slate-500">{formatHistoryDate(ev.event_date)}</p>
    </div>
  );
}
