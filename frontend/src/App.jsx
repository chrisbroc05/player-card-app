import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import StudioPage from "./pages/StudioPage";
import CardDetailPage from "./pages/CardDetailPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MyCollectionPage from "./pages/MyCollectionPage";
import TradesPage from "./pages/TradesPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminRoute from "./components/AdminRoute";
import ProfilePage from "./pages/ProfilePage";
import MarketplacePage from "./pages/MarketplacePage";
import MarketplaceCardDetailPage from "./pages/MarketplaceCardDetailPage";
import MarketplaceMyListingsPage from "./pages/MarketplaceMyListingsPage";
import MarketplaceMyOffersPage from "./pages/MarketplaceMyOffersPage";
import MarketplaceOfferDetailPage from "./pages/MarketplaceOfferDetailPage";
import CreditsPage from "./pages/CreditsPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  const location = useLocation();

  return (
    <div key={location.pathname} className="page-content">
      <Routes location={location}>
      <Route path="/index.html" element={<Navigate to="/" replace />} />
      <Route path="/" element={<StudioPage />} />
      <Route path="/studio" element={<StudioPage />} />
      <Route path="/vault" element={<MyCollectionPage vaultView />} />
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
      <Route path="/marketplace/my-listings" element={<MarketplaceMyListingsPage />} />
      <Route path="/marketplace/my-offers/:offerId" element={<MarketplaceOfferDetailPage />} />
      <Route path="/marketplace/my-offers" element={<MarketplaceMyOffersPage />} />
      <Route path="/marketplace/:cardId" element={<MarketplaceCardDetailPage />} />
      <Route path="/marketplace" element={<MarketplacePage />} />
      <Route path="/trades" element={<TradesPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/credits" element={<CreditsPage />} />
      </Routes>
    </div>
  );
}
