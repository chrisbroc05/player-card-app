import React from "react";

export default function AppHeader() {
  return (
    <header className="border-b border-white/10 bg-cardBg/50 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <h1 className="text-xl font-semibold tracking-tight text-white">
          Card<span className="text-neonBlue">Vault</span>
        </h1>
      </div>
    </header>
  );
}
