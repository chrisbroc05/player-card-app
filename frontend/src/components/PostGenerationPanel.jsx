import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toApiUrl, API_BASE_URL, authHeaders } from "../config/api";
import { vaultTierBadge, formatEdition, rarityDisplay } from "../utils/tierStyles";
import CardImage from "./CardImage";
import ShareCard from "./ShareCard";
import QuantitySelector from "./QuantitySelector";
import { isAnimatedCard } from "../utils/animationCard";

export default function PostGenerationPanel({
  detail,
  onViewCollection,
  isLoggedIn = false,
  showQuantityFlow = false,
  token = "",
  onRefreshDetail,
  onCardsUpdated,
  copyUnitPrice = 0,
}) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("select");
  const [completedQty, setCompletedQty] = useState(1);
  const [qtyLoading, setQtyLoading] = useState(false);
  const [qtyError, setQtyError] = useState("");

  useEffect(() => {
    if (!detail?.card_id) return;
    const pr = Number(detail.print_run) || 1;
    setPhase(pr > 1 ? "success" : "select");
    setCompletedQty(pr);
    setQtyError("");
  }, [detail?.card_id]);

  if (!detail?.image_url) return null;

  const imgSrc = toApiUrl(detail.image_url);
  const badge = vaultTierBadge(detail.tier);
  const downloadName = detail.card_id ? `future-legends-${detail.card_id}.png` : "future-legends-card.png";
  const showQty = Boolean(showQuantityFlow && isLoggedIn && token);
  const total = Number(detail.print_run) || completedQty || 1;

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
            <p className="mb-4 text-center text-sm font-medium text-emerald-300/95">Card saved to your collection!</p>
          ) : (
            <p className="mb-4 text-center text-sm text-slate-400">
              <Link
                to="/register"
                className="font-medium text-neonTeal underline decoration-neonTeal/30 underline-offset-2 hover:text-teal-200"
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
          <CardImage card={detail} alt={detail.player_name || "Card"} forcePlay={isAnimatedCard(detail)} />
        </div>
      </div>

      <div className="mx-auto mt-5 max-w-lg space-y-3 text-center">
        <p className="text-xl font-semibold text-white">{detail.player_name}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badge.pill}`}>{badge.label}</span>
          <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-slate-300">
            {rarityDisplay(detail.rarity)}
          </span>
        </div>
        <p className="text-sm text-slate-400">
          {formatEdition(detail.edition_number, detail.print_run)}
          {detail.theme && detail.theme !== "none" ? (
            <span className="block pt-1 text-xs text-slate-500">Theme: {detail.theme}</span>
          ) : null}
        </p>
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
            copyUnitPrice={copyUnitPrice}
          />
        </>
      ) : null}

      {showQty && phase === "success" ? (
        <div className="mt-8 space-y-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5 text-center sm:text-left">
          <p className="text-lg font-semibold text-emerald-100">Your cards are ready! 🎉</p>
          <p className="text-sm text-emerald-50/95">
            {total} {total === 1 ? "card" : "cards"} added to your collection
          </p>
          <p className="text-sm text-slate-200">
            {total === 1
              ? "Card #1 of 1"
              : `Card #1 of ${total} through Card #${total} of ${total}`}
          </p>
          <div className="flex flex-col gap-3">
            <a
              href={imgSrc}
              download={downloadName}
              className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl border border-cyan-300/40 bg-cyan-400/10 px-4 py-2.5 text-sm font-medium text-cyan-100"
            >
              Download
            </a>
            <ShareCard card={detail} sectionTitle="Share" />
            <button
              type="button"
              onClick={() => (onViewCollection ? onViewCollection() : navigate("/my-collection"))}
              className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl bg-neonBlue px-4 py-2.5 text-sm font-medium text-slate-950"
            >
              View My Collection
            </button>
          </div>
        </div>
      ) : null}

      {!showQty ? (
        <>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
            <a
              href={imgSrc}
              download={downloadName}
              className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-xl border border-cyan-300/40 bg-cyan-400/10 px-4 py-2.5 text-sm font-medium text-cyan-100 sm:flex-none"
            >
              Download Card
            </a>
            {isLoggedIn && onViewCollection ? (
              <button
                type="button"
                onClick={onViewCollection}
                className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-xl bg-neonBlue px-4 py-2.5 text-sm font-medium text-slate-950 sm:flex-none"
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
