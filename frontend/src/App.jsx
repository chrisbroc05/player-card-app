import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import StudioPage from "./pages/StudioPage";
import CardDetailPage from "./pages/CardDetailPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MyCollectionPage from "./pages/MyCollectionPage";

export default function App() {
  return (
    <Routes>
      {/* If the host misconfigured SPA routing as a 301 redirect to /index.html, the
          browser lands here with no matching /card route — send users home instead of a blank screen. */}
      <Route path="/index.html" element={<Navigate to="/" replace />} />
      <Route path="/" element={<StudioPage />} />
      <Route path="/vault" element={<Navigate to="/my-collection" replace />} />
      <Route path="/card/:cardId" element={<CardDetailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/my-collection" element={<MyCollectionPage />} />
    </Routes>
  );
}
