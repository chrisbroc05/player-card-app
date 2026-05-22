import React from "react";
import CardImage from "./CardImage";
import { CARD_IMAGE_FRAME_THUMB } from "../utils/cardImageStyles";

/** Horizontal scroll of trade offer / counter cards */
export default function TradeCardsThumbRow({ cards, className = "" }) {
  if (!cards?.length) return null;
  return (
    <div className={`flex gap-2 overflow-x-auto pb-1 ${className}`}>
      {cards.map((c) => (
        <div
          key={c.card_id}
          className="w-[72px] shrink-0 rounded-lg border border-white/10 bg-black/30 p-1"
        >
          <CardImage card={c} alt={c.player_name} frameClassName={CARD_IMAGE_FRAME_THUMB} playOnHover />
          <p className="mt-1 truncate text-[10px] font-medium text-white">{c.player_name}</p>
          <p className="truncate font-mono text-[9px] text-slate-500">{c.card_id}</p>
        </div>
      ))}
    </div>
  );
}
