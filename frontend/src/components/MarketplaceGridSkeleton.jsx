import React from "react";

export default function MarketplaceGridSkeleton({ count = 6, viewMode = "grid" }) {
  const isList = viewMode === "list";
  const gridClass = isList
    ? "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
    : "grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-5 lg:gap-3";

  return (
    <div className={gridClass}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse rounded-xl border border-white/10 bg-cardBg ${isList ? "rounded-2xl p-3" : "p-2"}`}
        >
          <div className="aspect-[2/3] rounded-lg bg-white/5" />
          <div className={`space-y-2 ${isList ? "mt-3 px-1" : "mt-2"}`}>
            <div className={`rounded bg-white/10 ${isList ? "h-4 w-3/4" : "h-3 w-full"}`} />
            {!isList ? <div className="h-3 w-2/3 rounded bg-white/10" /> : null}
            <div className={`rounded bg-white/10 ${isList ? "h-5 w-1/3" : "h-3 w-1/2"}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
