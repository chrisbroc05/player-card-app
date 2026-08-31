import React, { useCallback, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import StudioPage from "./pages/StudioPage";
import CardDetailPage from "./pages/CardDetailPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import GoogleAuthSuccess from "./pages/GoogleAuthSuccess";
import GoogleInvitePage from "./pages/GoogleInvitePage";
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
import ContactPage from "./pages/ContactPage";
import HelpPage from "./pages/HelpPage";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import PublicProfilePage from "./pages/PublicProfilePage";
import { IOSInstallHint } from "./components/IOSInstallHint";
import { BiometricGate } from "./components/BiometricGate";
import { useAuth } from "./context/AuthContext";
import { isBiometricRequired, updateLastActive } from "./utils/activityTracker";
import { isBiometricAvailable } from "./utils/webauthn";

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { token, initializing, logout } = useAuth();
  const [showBiometricGate, setShowBiometricGate] = useState(false);

  const handleBiometricFallback = useCallback(() => {
    logout();
    setShowBiometricGate(false);
    navigate("/login", { replace: true });
  }, [logout, navigate]);

  useEffect(() => {
    if (initializing || !token) return undefined;

    let cancelled = false;

    const checkBiometric = async () => {
      try {
        if (!isBiometricRequired()) {
          updateLastActive();
          return;
        }

        const available = await isBiometricAvailable();
        if (cancelled) return;

        if (available) {
          setShowBiometricGate(true);
        } else {
          updateLastActive();
        }
      } catch {
        if (!cancelled) updateLastActive();
      }
    };

    checkBiometric();

    return () => {
      cancelled = true;
    };
  }, [initializing, token]);

  useEffect(() => {
    if (!token || showBiometricGate) return undefined;

    const handleActivity = () => updateLastActive();

    window.addEventListener("click", handleActivity);
    window.addEventListener("touchstart", handleActivity);

    return () => {
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
    };
  }, [token, showBiometricGate]);

  return (
    <>
      <div key={location.pathname} className="page-content">
        <Routes location={location}>
          <Route path="/index.html" element={<Navigate to="/" replace />} />
          <Route path="/" element={<StudioPage />} />
          <Route path="/studio" element={<StudioPage />} />
          <Route path="/vault" element={<MyCollectionPage vaultView />} />
          <Route path="/card/:cardId" element={<CardDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/google/success" element={<GoogleAuthSuccess />} />
          <Route path="/google-invite" element={<GoogleInvitePage />} />
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
          <Route path="/profile/:username" element={<PublicProfilePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/credits" element={<CreditsPage />} />
        </Routes>
      </div>
      <IOSInstallHint />

      {showBiometricGate ? (
        <BiometricGate
          onSuccess={() => {
            setShowBiometricGate(false);
            updateLastActive();
          }}
          onFallback={handleBiometricFallback}
        />
      ) : null}
    </>
  );
}
