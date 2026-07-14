import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { FeatureProvider } from "./context/FeatureContext";
import { NewCardCelebrationProvider } from "./context/NewCardCelebrationContext";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <FeatureProvider>
        <AuthProvider>
          <NewCardCelebrationProvider>
            <App />
          </NewCardCelebrationProvider>
        </AuthProvider>
      </FeatureProvider>
    </BrowserRouter>
  </React.StrictMode>
);
