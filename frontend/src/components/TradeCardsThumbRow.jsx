import React from "react";
import CardImage from "./CardImage";
import { cardMediaFrameClass } from "../utils/highlightCard";
import { CARD_ASPECT } from "../utils/cardImageStyles";

const INBOX_THUMB_FRAME = `relative w-full ${CARD_ASPECT}`;

function inboxLayoutClass(count) {
  if (count <= 1) return "flex w-full justify-center";
  if (count === 2) return "flex w-full flex-wrap justify-center gap-3";
  return "flex w-full max-w-full flex-wrap justify-center gap-2 sm:flex-nowrap sm:justify-center sm:overflow-x-auto sm:pb-1";
}

function thumbShellClass(count, variant) {
  if (variant !== "inbox") return "w-[72px] shrink-0 rounded-lg border border-white/10 bg-black/30 p-1";
  if (count <= 2) return "w-[5.75rem] shrink-0 rounded-lg border border-white/10 bg-black/30 p-1.5 sm:w-[6.25rem]";
  return "w-[4.75rem] shrink-0 rounded-lg border border-white/10 bg-black/30 p-1";
}

/** Trade offer / counter card thumbnails (scroll row or inbox-adaptive grid). */
export default function TradeCardsThumbRow({
  cards,
  className = "",
  variant = "default",
  showCaptions = true,
}) {
  const list = cards?.length ? cards : [];
  if (!list.length) return null;

  const count = list.length;
  const captions = variant === "inbox" ? false : showCaptions;
  const rowClass =
    variant === "inbox"
      ? `${inboxLayoutClass(count)} ${className}`.trim()
      : `flex gap-2 overflow-x-auto pb-1 ${className}`.trim();

  return (
    <div className={rowClass}>
      {list.map((c) => (
        <div key={c.card_id} className={thumbShellClass(count, variant)}>
          <CardImage
            card={c}
            alt={c.player_name}
            frameClassName={variant === "inbox" ? INBOX_THUMB_FRAME : cardMediaFrameClass(c, { thumb: true })}
            playOnHover
            infoBannerVariant="compact"
            showInfoBanner={false}
          />
          {captions ? (
            <>
              <p className="mt-1 truncate text-[10px] font-medium text-white">{c.player_name}</p>
              <p className="truncate font-mono text-[9px] text-slate-500">{c.card_id}</p>
            </>
          ) : null}
        </div>
      ))}
    </div>
  );
}
