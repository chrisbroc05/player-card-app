import React from "react";

export default function CollectionToast({ message, variant = "success" }) {
  if (!message) return null;
  const styles =
    variant === "error"
      ? "border-rose-400/40 text-rose-100"
      : "border-emerald-400/40 text-emerald-100";
  return (
    <div
      role="status"
      className={`pointer-events-none fixed bottom-6 left-1/2 z-[100] max-w-[90vw] -translate-x-1/2 rounded-xl border bg-slate-950/95 px-4 py-2.5 text-center text-sm font-medium shadow-2xl shadow-black/50 backdrop-blur-md ${styles}`}
    >
      {message}
    </div>
  );
}
