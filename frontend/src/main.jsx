import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SettingsProvider } from "./context/SettingsContext";
import { FeatureProvider } from "./context/FeatureContext";
import { NewCardCelebrationProvider } from "./context/NewCardCelebrationContext";
import App from "./App";
import "./index.css";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("App error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            background: "#0A0A0A",
            color: "#C9A84C",
            flexDirection: "column",
            gap: "16px",
            fontFamily: "sans-serif",
            textAlign: "center",
            padding: "24px",
          }}
        >
          <img src="/prospect-legends-logo.png" style={{ width: "80px" }} alt="PL" />
          <h2 style={{ color: "#FFFFFF" }}>Something went wrong</h2>
          <p style={{ color: "#666" }}>Please refresh the page</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: "#C9A84C",
              color: "#0A0A0A",
              border: "none",
              padding: "12px 24px",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <React.StrictMode>
      <BrowserRouter>
        <FeatureProvider>
          <AuthProvider>
            <SettingsProvider>
              <NewCardCelebrationProvider>
                <App />
              </NewCardCelebrationProvider>
            </SettingsProvider>
          </AuthProvider>
        </FeatureProvider>
      </BrowserRouter>
    </React.StrictMode>
  </ErrorBoundary>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => {
        console.log("SW registered");
      })
      .catch((err) => {
        console.warn("SW failed:", err);
      });
  });
}
