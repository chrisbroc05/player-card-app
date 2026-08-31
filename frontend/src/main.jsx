import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SettingsProvider } from "./context/SettingsContext";
import { FeatureProvider } from "./context/FeatureContext";
import { NewCardCelebrationProvider } from "./context/NewCardCelebrationContext";
import App from "./App";
import "./index.css";

const hideSplash = () => {
  const splash = document.getElementById("splash-screen");
  if (splash) {
    splash.style.opacity = "0";
    setTimeout(() => {
      splash.style.display = "none";
    }, 500);
  }
};

let appReady = false;
let minTimeReached = false;

const tryHideSplash = () => {
  if (appReady && minTimeReached) {
    hideSplash();
  }
};

setTimeout(() => {
  minTimeReached = true;
  tryHideSplash();
}, 1500);

document.addEventListener("touchstart", hideSplash, { once: true });
document.addEventListener("click", hideSplash, { once: true });

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

setTimeout(() => {
  appReady = true;
  tryHideSplash();
}, 100);
