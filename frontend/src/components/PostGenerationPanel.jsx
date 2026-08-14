import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL, authHeaders } from "../config/api";
import { vaultTierBadge, rarityDisplay } from "../utils/tierStyles";
import CardImage from "./CardImage";
import ShareCard from "./ShareCard";
import QuantitySelector from "./QuantitySelector";
import { isAnimatedCard, hasAnimatedVideo } from "../utils/animationCard";
import { isHighlightCard } from "../utils/highlightCard";
import { downloadCardMedia, getCardDownloadTarget } from "../utils/downloadCardMedia";

export default function PostGenerationPanel({
  detail,
  onViewCollection,
  isLoggedIn = false,
  showQuantityFlow = false,
  token = "",
  onRefreshDetail,
  onCardsUpdated,
  copyPricingTiers,
}) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("select");
  const [completedQty, setCompletedQty] = useState(1);
  const [qtyLoading, setQtyLoading] = useState(false);
  const [qtyError, setQtyError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    if (!detail?.card_id) return;
    const pr = Number(detail.print_run) || 1;
    setPhase(pr > 1 ? "success" : "select");
    setCompletedQty(pr);
    setQtyError("");
  }, [detail?.card_id]);

  if (!detail?.image_url) return null;

  const badge = vaultTierBadge(detail.tier);
  const canDownload = Boolean(getCardDownloadTarget(detail)?.url);
  const showQty = Boolean(showQuantityFlow && isLoggedIn && token);
  const total = Number(detail.print_run) || completedQty || 1;
  const showAnimated = hasAnimatedVideo(detail) || isAnimatedCard(detail);

  async function handleDownload() {
    if (!canDownload) return;
    setDownloadError("");
    setDownloading(true);
    try {
      await downloadCardMedia(detail, token);
    } catch (error) {
      console.error("Download failed:", error);
      setDownloadError("Download failed — please try again.");
    } finally {
      setDownloading(false);
    }
  }

  async function handleQuantityConfirm(quantity) {
    if (!detail?.card_id || !token) return;
    setQtyError("");
    setQtyLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/cards/${encodeURIComponent(detail.card_id)}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({ quantity }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data?.detail === "string"
            ? data.detail
            : Array.isArray(data?.detail)
              ? data.detail.map((x) => x?.msg || x).join(" ")
              : "Could not create copies.";
        throw new Error(msg);
      }
      await onRefreshDetail?.();
      await onCardsUpdated?.();
      setCompletedQty(quantity);
      setPhase("success");
    } catch (e) {
      setQtyError(e.message || "Could not create copies.");
    } finally {
      setQtyLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-cardBg2/80 p-4 shadow-xl sm:p-6">
      <p className="mb-2 text-center text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Your collectible</p>

      {!showQty ? (
        <>
          {isLoggedIn ? (
            <p className="mb-4 text-center text-sm font-medium text-success/95">
              {showAnimated
                ? "Your animated card has been added to your collection!"
                : "Card saved to your collection!"}
            </p>
          ) : (
            <p className="mb-4 text-center text-sm text-slate-400">
              <Link
                to="/register"
                className="font-medium text-brand-gold underline decoration-[var(--color-gold-primary/30] underline-offset-2 hover:text-brand-gold"
              >
                Create an account
              </Link>{" "}
              to save your cards!
            </p>
          )}
        </>
      ) : phase === "select" ? (
        <p className="mb-4 text-center text-sm text-slate-300">
          Choose how many copies to mint into your collection. One image — unique card IDs for each copy.
        </p>
      ) : null}

      <div className="mx-auto max-w-md">
        <div className={`overflow-hidden rounded-xl border-2 bg-black/20 transition duration-500 ${badge.glow}`}>
          <CardImage
            card={detail}
            alt={detail.player_name || "Card"}
            frameClassName="w-full"
            variant="detail"
            forcePlay={showAnimated || isHighlightCard(detail)}
          />
        </div>
      </div>

      <div className="mx-auto mt-5 max-w-lg text-center">
        <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-slate-300">
          {rarityDisplay(detail.rarity)}
        </span>
      </div>

      {showQty && phase === "select" ? (
        <>
          {qtyError ? (
            <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-center text-sm text-rose-100">
              {qtyError}
            </p>
          ) : null}
          <QuantitySelector
            disabled={!detail.card_id}
            loading={qtyLoading}
            onConfirm={handleQuantityConfirm}
            copyPricingTiers={copyPricingTiers}
            currentRun={Number(detail.print_run) || 1}
          />
        </>
      ) : null}

      {showQty && phase === "success" ? (
        <div className="mt-8 space-y-4 rounded-2xl border bg-success-subtle p-5 text-center sm:text-left">
          <p className="text-lg font-semibold text-success">Your cards are ready! 🎉</p>
          <p className="text-sm text-success/95">
            {total} {total === 1 ? "card" : "cards"} added to your collection
          </p>
          <p className="text-sm text-slate-200">
            {total === 1
              ? "Card #1 of 1"
              : `Card #1 of ${total} through Card #${total} of ${total}`}
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading || !canDownload}
              className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border bg-gold-subtle px-4 py-2.5 text-sm font-medium text-brand-gold disabled:opacity-50"
            >
              {downloading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-gold/30 border-t-brand-gold" aria-hidden />
              ) : null}
              {downloading ? "Downloading..." : "Download"}
            </button>
            {downloadError ? (
              <p className="text-center text-xs text-rose-200">{downloadError}</p>
            ) : null}
            <ShareCard card={detail} sectionTitle="Share" />
            <button
              type="button"
              onClick={() => (onViewCollection ? onViewCollection() : navigate("/my-collection"))}
              className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl btn-primary px-4 py-2.5 text-sm font-medium text-slate-950"
            >
              View My Collection
            </button>
          </div>
        </div>
      ) : null}

      {!showQty ? (
        <>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading || !canDownload}
              className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl border bg-gold-subtle px-4 py-2.5 text-sm font-medium text-brand-gold disabled:opacity-50 sm:flex-none"
            >
              {downloading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-gold/30 border-t-brand-gold" aria-hidden />
              ) : null}
              {downloading ? "Downloading..." : "Download Card"}
            </button>
            {downloadError ? (
              <p className="w-full text-center text-xs text-rose-200 sm:order-last">{downloadError}</p>
            ) : null}
            {isLoggedIn && onViewCollection ? (
              <button
                type="button"
                onClick={onViewCollection}
                className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-xl btn-primary px-4 py-2.5 text-sm font-medium text-slate-950 sm:flex-none"
              >
                View My Collection
              </button>
            ) : null}
          </div>
          <ShareCard card={detail} sectionTitle="Share Your Card" />
        </>
      ) : null}
    </div>
  );
}
