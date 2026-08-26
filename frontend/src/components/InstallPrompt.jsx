import { useState, useEffect } from "react";
import "../styles/installPrompt.css";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return undefined;
    }

    const iOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsIOS(iOS);

    function handleBeforeInstallPrompt(e) {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    let iosTimer;
    if (iOS) {
      const dismissed = localStorage.getItem("pwa-banner-dismissed");
      if (!dismissed) {
        iosTimer = window.setTimeout(() => setShowBanner(true), 3000);
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      if (iosTimer) window.clearTimeout(iosTimer);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setShowBanner(false);
    localStorage.setItem("pwa-banner-dismissed", "true");
  }

  if (!showBanner || isInstalled) return null;

  return (
    <div className="install-prompt">
      <img src="/icons/icon-72x72.png" alt="PL" className="install-icon" />
      <div className="install-text">
        <strong>Add to Home Screen</strong>
        {isIOS ? (
          <span>Tap the Share button then &quot;Add to Home Screen&quot;</span>
        ) : (
          <span>Install Prospect Legends for the best experience</span>
        )}
      </div>
      {!isIOS ? (
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
