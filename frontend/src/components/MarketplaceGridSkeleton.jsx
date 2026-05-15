import React from "react";

export default function MarketplaceGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-white/10 bg-cardBg p-3">
          <div className="aspect-[2/3] rounded-xl bg-white/5" />
          <div className="mt-3 space-y-2 px-1">
            <div className="h-4 w-3/4 rounded bg-white/10" />
            <div className="h-3 w-1/2 rounded bg-white/10" />
            <div className="h-5 w-1/3 rounded bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}
