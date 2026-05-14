import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import StudioPage from "./pages/StudioPage";
import CardDetailPage from "./pages/CardDetailPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MyCollectionPage from "./pages/MyCollectionPage";
import TradesPage from "./pages/TradesPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminRoute from "./components/AdminRoute";
import ProfilePage from "./pages/ProfilePage";

export default function App() {
  return (
    <Routes>
      <Route path="/index.html" element={<Navigate to="/" replace />} />
      <Route path="/" element={<StudioPage />} />
      <Route path="/vault" element={<Navigate to="/my-collection" replace />} />
      <Route path="/card/:cardId" element={<CardDetailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/my-collection" element={<MyCollectionPage />} />
      <Route path="/trades" element={<TradesPage />} />
      <Route path="/profile" element={<ProfilePage />} />
    </Routes>
  );
}
