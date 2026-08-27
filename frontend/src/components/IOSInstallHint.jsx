import { useState, useEffect } from "react";

export function IOSInstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isStandalone = window.navigator.standalone === true;
      const dismissed = sessionStorage.getItem("ios-hint-dismissed");

      if (isIOS && !isStandalone && !dismissed) {
        const timer = window.setTimeout(() => setShow(true), 4000);
        return () => window.clearTimeout(timer);
      }
    } catch {
      // silently fail
    }
    return undefined;
  }, []);

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "100px",
        left: "16px",
        right: "16px",
        background: "#1C1C1C",
        border: "1px solid rgba(201,168,76,0.4)",
        borderRadius: "14px",
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        zIndex: 300,
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      }}
    >
      <span style={{ fontSize: "24px" }}>⬆️</span>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: "13px",
            fontWeight: "700",
            color: "#FFFFFF",
            fontFamily: "Barlow Condensed, sans-serif",
          }}
        >
          Add to Home Screen
        </div>
        <div
          style={{
            fontSize: "11px",
            color: "#888888",
            marginTop: "2px",
          }}
        >
          Tap the Share button then &quot;Add to Home Screen&quot;
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          try {
            sessionStorage.setItem("ios-hint-dismissed", "true");
          } catch {
            // ignore
          }
          setShow(false);
        }}
        style={{
          background: "transparent",
          border: "none",
          color: "#888",
          fontSize: "18px",
          cursor: "pointer",
          padding: "4px",
          lineHeight: 1,
        }}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
