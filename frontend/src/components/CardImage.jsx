import React, { useMemo, useState } from "react";
import { toApiUrl } from "../config/api";

const IMG_BASE = "block h-auto w-full object-contain";

/** Renders a card image; shows a placeholder if the file is missing (e.g. 404 after host restart). */
export default function CardImage({ imageUrl, alt, className = "", frameClassName = "", cacheBust }) {
  const [failed, setFailed] = useState(false);

  const src = useMemo(() => {
    const base = toApiUrl(imageUrl);
    if (!base || !cacheBust) return base;
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}cb=${encodeURIComponent(String(cacheBust))}`;
  }, [imageUrl, cacheBust]);

  const imgClass = [IMG_BASE, className].filter(Boolean).join(" ");

  if (failed || !src) {
    const inner = (
      <PlaceholderInner alt={alt} className={className} />
    );
    if (frameClassName) {
      return <div className={frameClassName}>{inner}</div>;
    }
    return inner;
  }

  if (frameClassName) {
    return (
      <div className={frameClassName}>
        <img
          src={src}
          alt={alt || "Card"}
          className={imgClass}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || "Card"}
      className={imgClass}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

function PlaceholderInner({ alt, className }) {
  return (
    <div
      className={`flex min-h-[120px] flex-col items-center justify-center gap-2 bg-slate-900/90 p-4 text-center text-slate-400 ${className}`}
      role="img"
      aria-label={alt || "Card preview unavailable"}
    >
      <span className="text-2xl opacity-50" aria-hidden>
        ?
      </span>
      <p className="text-xs leading-snug">Image file missing (often after a deploy without persistent disk).</p>
    </div>
  );
}
