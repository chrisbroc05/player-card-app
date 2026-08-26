import { useState, useEffect } from "react";
import "../styles/installPrompt.css";

export function InstallPrompt() {
  const [showBanner, setShowBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    try {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true;

      if (isStandalone) return undefined;

      const iOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      setIsIOS(iOS);

      let iosTimer;
      if (iOS) {
        try {
          const dismissed = localStorage.getItem("pwa-banner-dismissed");
          if (!dismissed) {
            iosTimer = window.setTimeout(() => setShowBanner(true), 5000);
          }
        } catch {
          // localStorage not available on some iOS browsers
        }
      }

      const handler = (e) => {
        try {
          e.preventDefault();
          setDeferredPrompt(e);
          setShowBanner(true);
        } catch {
          // ignore
        }
      };

      window.addEventListener("beforeinstallprompt", handler);

      return () => {
        window.removeEventListener("beforeinstallprompt", handler);
        if (iosTimer) window.clearTimeout(iosTimer);
      };
    } catch (e) {
      console.warn("InstallPrompt error:", e);
      return undefined;
    }
  }, []);

  function handleDismiss() {
    try {
      setShowBanner(false);
      localStorage.setItem("pwa-banner-dismissed", "true");
    } catch {
      setShowBanner(false);
    }
  }

  async function handleInstall() {
    try {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const result = await deferredPrompt.userChoice;
        if (result.outcome === "accepted") {
          setShowBanner(false);
        }
        setDeferredPrompt(null);
      }
    } catch {
      setShowBanner(false);
    }
  }

  if (!showBanner) return null;

  return (
    <div className="install-prompt">
      <img
        src="/icons/icon-72x72.png"
        alt="PL"
        className="install-icon"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
      <div className="install-text">
        <strong>Add to Home Screen</strong>
        {isIOS ? (
          <span>Tap Share then &quot;Add to Home Screen&quot;</span>
        ) : (
          <span>Install for the best experience</span>
        )}
      </div>
      {!isIOS && deferredPrompt ? (
        <button type="button" onClick={handleInstall} className="install-button">
          Install
        </button>
      ) : null}
      <button type="button" onClick={handleDismiss} className="install-dismiss" aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
