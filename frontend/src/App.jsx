import React from "react";
import { Routes, Route } from "react-router-dom";
import StudioPage from "./pages/StudioPage";
import VaultPage from "./pages/VaultPage";
import CardDetailPage from "./pages/CardDetailPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<StudioPage />} />
      <Route path="/vault" element={<VaultPage />} />
      <Route path="/card/:cardId" element={<CardDetailPage />} />
    </Routes>
  );
}
