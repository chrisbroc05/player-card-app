import React from "react";
import { toApiUrl } from "../config/api";
import { vaultTierBadge, formatEdition, rarityDisplay } from "../utils/tierStyles";

export default function PostGenerationPanel({
  detail,
  shareToast,
  onShare,
  onVault,
  downloadFileName = "future-legends-card.png",
}) {
  if (!detail?.image_url) return null;

  const imgSrc = toApiUrl(detail.image_url);
  const badge = vaultTierBadge(detail.tier);

  return (
    <div className="rounded-2xl border border-white/10 bg-cardBg2/80 p-4 shadow-xl sm:p-6">
      <p className="mb-4 text-center text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
        Your collectible
      </p>
      <div className="mx-auto max-w-md">
        <div
          className={`overflow-hidden rounded-xl border-2 bg-black/20 transition duration-500 ${badge.glow}`}
        >
          <img src={imgSrc} alt={detail.player_name || "Card"} className="w-full object-cover" />
        </div>
      </div>

      <div className="mx-auto mt-5 max-w-lg space-y-3 text-center">
        <p className="text-xl font-semibold text-white">{detail.player_name}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badge.pill}`}>
            {badge.label}
          </span>
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

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
        <a
          href={imgSrc}
          download={downloadFileName}
          className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-xl border border-cyan-300/40 bg-cyan-400/10 px-4 py-2.5 text-sm font-medium text-cyan-100 sm:flex-none"
        >
          Download Card
        </a>
        <button
          type="button"
          onClick={onShare}
          className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-xl border border-violet-300/40 bg-violet-400/10 px-4 py-2.5 text-sm font-medium text-violet-100 sm:flex-none"
        >
          Share Card
        </button>
        <button
          type="button"
          onClick={onVault}
          className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-xl bg-neonBlue px-4 py-2.5 text-sm font-medium text-slate-950 sm:flex-none"
        >
          View My Vault
        </button>
      </div>

      {shareToast ? (
        <p className="mt-3 text-center text-xs font-medium text-emerald-300">{shareToast}</p>
      ) : null}
    </div>
  );
}
