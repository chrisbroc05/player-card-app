import React from "react";
import { Routes, Route } from "react-router-dom";
import StudioPage from "./pages/StudioPage";
import VaultPage from "./pages/VaultPage";
import CardDetailPage from "./pages/CardDetailPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MyCollectionPage from "./pages/MyCollectionPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<StudioPage />} />
      <Route path="/vault" element={<VaultPage />} />
      <Route path="/card/:cardId" element={<CardDetailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/my-collection" element={<MyCollectionPage />} />
    </Routes>
  );
}
