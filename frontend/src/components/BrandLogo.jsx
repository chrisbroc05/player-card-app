import React from "react";

export default function BrandLogo({ className = "", compact = false }) {
  return (
    <img
      src="/prospect-legends-logo.png"
      alt="Prospect Legends"
      className={`h-7 w-auto object-contain sm:h-9 ${className}`}
      width={compact ? 120 : 160}
      height={compact ? 28 : 36}
    />
  );
}
