import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SettingsProvider } from "./context/SettingsContext";
import { FeatureProvider } from "./context/FeatureContext";
import { NewCardCelebrationProvider } from "./context/NewCardCelebrationContext";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")).render(
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
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registered:", registration.scope);
      })
      .catch((error) => {
        console.log("SW registration failed:", error);
      });
  });
}
