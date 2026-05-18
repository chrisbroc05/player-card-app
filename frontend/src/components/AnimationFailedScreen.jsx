import React from "react";
import { Link } from "react-router-dom";

export default function AnimationFailedScreen({ cardId }) {
  const cardPath = cardId ? `/card/${encodeURIComponent(cardId)}` : "/my-collection";

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-3xl opacity-60" aria-hidden>
        ⚠
      </p>
      <h2 className="mt-4 text-xl font-semibold text-white">Something went wrong</h2>
      <p className="mt-3 max-w-md text-sm text-slate-400">
        We couldn&apos;t generate the animation for this card. Your card has been saved as a standard card. You can try
        animating it again from your collection.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          to={cardPath}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-neonTeal px-5 text-sm font-semibold text-slate-950"
        >
          View My Card
        </Link>
        <Link
          to="/my-collection"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/20 px-5 text-sm text-slate-200"
        >
          Go to My Collection
        </Link>
      </div>
    </div>
  );
}
