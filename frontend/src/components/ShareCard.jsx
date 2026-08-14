import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link2, Download, Instagram, Share2, X } from "lucide-react";
import { API_BASE_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { useFeatures } from "../context/FeatureContext";
import { vaultTierBadge, tierShareHashtagKey } from "../utils/tierStyles";
import { downloadCardMedia, getCardDownloadTarget } from "../utils/downloadCardMedia";

function buildClientCardUrl(card) {
  const slug = card?.shareable_slug || card?.card_id;
  if (!slug || typeof window === "undefined") return "";
  return `${window.location.origin}/card/${encodeURIComponent(slug)}`;
}

function buildFallbackShareText(card) {
  const label = vaultTierBadge(card?.tier).label;
  const tag = tierShareHashtagKey(card?.tier);
  const name = card?.player_name || "Player";
  return `Check out my ${label} Prospect Legends card for ${name}! #${tag}Card #ProspectLegends #YouthBaseball`;
}

export async function fetchCardShareMeta(cardId) {
  const res = await fetch(`${API_BASE_URL}/cards/${encodeURIComponent(cardId)}/meta`);
  if (!res.ok) throw new Error("meta");
  return res.json();
}

function useShareMeta(card) {
  const lookupId = card?.shareable_slug || card?.card_id;
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!lookupId) {
      setMeta(null);
      return undefined;
    }
    let cancelled = false;
    setError(false);
    fetchCardShareMeta(lookupId)
      .then((data) => {
        if (!cancelled) setMeta(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [lookupId]);

  const resolved = useMemo(() => {
    const clientUrl = buildClientCardUrl(card);
    if (meta) {
      return {
        share_text: meta.share_text,
        card_url: clientUrl || meta.shareable_url,
        image_url: meta.image_url,
        card_id: meta.card_id,
      };
    }
    return {
      share_text: buildFallbackShareText(card),
      card_url: clientUrl,
      image_url: card?.image_url || "",
      card_id: card?.card_id || "",
    };
  }, [meta, card]);

  return { meta, error, resolved };
}

function ShareToast({ message, variant = "success" }) {
  if (!message) return null;
  const tone =
    variant === "error"
      ? "border-rose-500/40 text-rose-100"
      : "border-[var(--color-success)]/40 text-success";
  return (
    <div
      role="status"
      className={`pointer-events-none fixed bottom-6 left-1/2 z-[100] max-w-[90vw] -translate-x-1/2 rounded-xl border bg-slate-950/95 px-4 py-2.5 text-center text-sm font-medium shadow-2xl shadow-black/50 backdrop-blur-md ${tone}`}
    >
      {message}
    </div>
  );
}

function DownloadSpinner() {
  return (
    <span
      className="h-4 w-4 animate-spin rounded-full border-2 border-brand-gold/30 border-t-brand-gold"
      aria-hidden
    />
  );
}

function ShareActionButtons({
  card,
  resolved,
  onCopyToast,
  downloading,
  setDownloading,
  igHint,
  setIgHint,
  compact,
  allowDownload = true,
}) {
  const { token } = useAuth();
  const { socialSharingEnabled } = useFeatures();
  const cardUrl = resolved.card_url;
  const shareText = resolved.share_text;
  const downloadTarget = getCardDownloadTarget(card);
  const canDownload = Boolean(allowDownload && downloadTarget?.url);

  const twitterHref = useMemo(() => {
    const text = encodeURIComponent(shareText);
    const url = encodeURIComponent(cardUrl);
    return `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
  }, [shareText, cardUrl]);

  const facebookHref = useMemo(() => {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(cardUrl)}`;
  }, [cardUrl]);

  async function copyLink() {
    if (!cardUrl) return;
    try {
      await navigator.clipboard.writeText(cardUrl);
      onCopyToast("Link copied!");
    } catch {
      onCopyToast("Copy failed — try the address bar.", "error");
    }
  }

  async function downloadCard() {
    if (!canDownload) return;
    setDownloading(true);
    try {
      await downloadCardMedia(card, token);
      onCopyToast("Card downloaded successfully!");
    } catch (error) {
      console.error("Download failed:", error);
      onCopyToast("Download failed — please try again.", "error");
    } finally {
      setDownloading(false);
    }
  }

  async function instagramDownload() {
    await downloadCard();
    if (!canDownload) return;
    setIgHint(true);
    window.setTimeout(() => setIgHint(false), 4000);
  }

  const btnBase =
    "flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2.5 text-[11px] font-medium text-slate-200 transition hover:border-white/25 hover:bg-white/[0.08] hover:text-white active:scale-[0.98] disabled:opacity-50";
  const wrap = compact
    ? "grid grid-cols-2 gap-2"
    : "grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center sm:gap-3";

  return (
    <div>
      <div className={wrap}>
        <button type="button" className={btnBase} onClick={copyLink}>
          <Link2 className="h-5 w-5 text-brand-gold/90" strokeWidth={2} />
          <span>Copy link</span>
        </button>
        {socialSharingEnabled ? (
          <a
            href={twitterHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btnBase} border-zinc-700 bg-zinc-950 hover:border-zinc-500 hover:bg-black`}
          >
            <X className="h-5 w-5 text-white" strokeWidth={2.5} />
            <span className="text-white">X</span>
          </a>
        ) : null}
        {socialSharingEnabled ? (
          <a
            href={facebookHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btnBase} border-[#1877F2]/50 bg-[#1877F2]/15 hover:border-[#1877F2]/70 hover:bg-[#1877F2]/25`}
          >
            <span className="text-lg font-bold leading-none text-[#1877F2]">f</span>
            <span className="text-slate-100">Facebook</span>
          </a>
        ) : null}
        {allowDownload ? (
          <button type="button" className={btnBase} onClick={downloadCard} disabled={downloading || !canDownload}>
            {downloading ? <DownloadSpinner /> : <Download className="h-5 w-5 text-brand-gold/90" strokeWidth={2} />}
            <span>{downloading ? "Downloading..." : "Download"}</span>
          </button>
        ) : null}
        {allowDownload && socialSharingEnabled && !compact ? (
          <div className="relative flex flex-col items-center">
            <button
              type="button"
              className={`${btnBase} w-full min-w-[4.5rem] bg-gradient-to-br from-[#833ab4]/25 via-[#fd1d1d]/20 to-[#fcb045]/20`}
              style={{ borderColor: "rgba(252,176,69,0.35)" }}
              onClick={instagramDownload}
              disabled={downloading || !canDownload}
            >
              {downloading ? <DownloadSpinner /> : <Instagram className="h-5 w-5 text-pink-100" strokeWidth={2} />}
              <span>Instagram</span>
            </button>
            {igHint ? (
              <p className="absolute -bottom-10 left-1/2 z-10 w-44 -translate-x-1/2 rounded-lg border border-white/15 bg-slate-950/95 px-2 py-1.5 text-center text-[10px] leading-snug text-slate-200 shadow-lg">
                Image downloaded! Open Instagram to share.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      {!socialSharingEnabled ? (
        <p className="mt-3 text-center text-xs text-[#666666]">Social sharing will be available at launch. Stay tuned!</p>
      ) : null}
    </div>
  );
}

export function CardSharePopover({ card, isOwner = true }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const { resolved } = useShareMeta(card);
  const [toast, setToast] = useState("");
  const [toastVariant, setToastVariant] = useState("success");
  const [downloading, setDownloading] = useState(false);
  const [igHint, setIgHint] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    const t = window.setTimeout(() => {
      document.addEventListener("click", onDocClick, true);
    }, 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("click", onDocClick, true);
    };
  }, [open]);

  const showToast = useCallback((msg, variant = "success") => {
    setToastVariant(variant);
    setToast(msg);
    window.setTimeout(() => setToast(""), 2000);
  }, []);

  if (!card?.card_id && !card?.shareable_slug) return null;

  return (
    <div ref={rootRef} className="relative z-20">
      <button
        type="button"
        aria-label="Share card"
        aria-expanded={open}
        className="rounded-full border border-white/20 bg-black/55 p-2 text-white shadow-lg backdrop-blur-sm transition hover:border-[var(--color-border-gold)] hover:bg-black/75"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <Share2 className="h-4 w-4" strokeWidth={2} />
      </button>
      {open ? (
        <div
          className="absolute right-0 top-full mt-2 w-[200px] rounded-xl border border-white/12 bg-slate-950/95 p-3 shadow-2xl shadow-black/40 backdrop-blur-md"
          onClick={(e) => e.stopPropagation()}
        >
          <ShareActionButtons
            card={card}
            resolved={resolved}
            onCopyToast={(m, variant) => {
              showToast(m, variant);
              if (variant !== "error") setOpen(false);
            }}
            downloading={downloading}
            setDownloading={setDownloading}
            igHint={igHint}
            setIgHint={setIgHint}
            compact
            allowDownload={isOwner}
          />
        </div>
      ) : null}
      <ShareToast message={toast} variant={toastVariant} />
    </div>
  );
}

export default function ShareCard({ card, sectionTitle = "Share this card", isOwner = true }) {
  const { error, resolved } = useShareMeta(card);
  const [toast, setToast] = useState("");
  const [toastVariant, setToastVariant] = useState("success");
  const [downloading, setDownloading] = useState(false);
  const [igHint, setIgHint] = useState(false);

  const showToast = useCallback((msg, variant = "success") => {
    setToastVariant(variant);
    setToast(msg);
    window.setTimeout(() => setToast(""), 2000);
  }, []);

  if (!card?.card_id && !card?.shareable_slug) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-center text-sm font-semibold uppercase tracking-[0.18em] text-slate-400 sm:text-left">
        {sectionTitle}
      </h2>
      <div className="rounded-2xl border border-white/10 bg-cardBg2/90 p-4 shadow-inner shadow-black/20 sm:p-5">
        {error ? (
          <p className="mb-3 text-center text-xs text-amber-200/90">Using on-page links — share server unavailable.</p>
        ) : null}
        <ShareActionButtons
          card={card}
          resolved={resolved}
          onCopyToast={showToast}
          downloading={downloading}
          setDownloading={setDownloading}
          igHint={igHint}
          setIgHint={setIgHint}
          compact={false}
          allowDownload={isOwner}
        />
      </div>
      <ShareToast message={toast} variant={toastVariant} />
    </section>
  );
}
