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

  const isAndroid = /Android/i.test(navigator.userAgent);

  return (
    <div
      style={{
        position: "fixed",
        bottom: "100px",
        left: "16px",
        right: "16px",
        background: "linear-gradient(145deg, #1C1A12, #2A2410)",
        border: "1px solid rgba(201,168,76,0.4)",
        borderRadius: "16px",
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        zIndex: 300,
        boxShadow: "0 0 0 1px rgba(201,168,76,0.1), 0 8px 32px rgba(0,0,0,0.6)",
      }}
    >
      <img
        src="/prospect-legends-logo.png"
        alt="PL"
        style={{
          width: "38px",
          height: "38px",
          borderRadius: "10px",
          flexShrink: 0,
          objectFit: "contain",
        }}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "14px",
            fontWeight: "800",
            color: "#C9A84C",
            fontFamily: "Barlow Condensed, sans-serif",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
          }}
        >
          Add to Home Screen
        </div>
        <div
          style={{
            fontSize: "11px",
            color: "#888888",
            marginTop: "2px",
            lineHeight: "1.4",
            fontFamily: "sans-serif",
          }}
        >
          {isAndroid ? (
            <>
              Tap Share then &quot;Add to Home Screen&quot; for the full app experience
            </>
          ) : (
            <>
              Tap the{" "}
              <span
                style={{
                  fontWeight: "700",
                  color: "#CCCCCC",
                }}
              >
                three dots ( ... )
              </span>{" "}
              at the bottom right of Safari, tap{" "}
              <span
                style={{
                  fontWeight: "700",
                  color: "#CCCCCC",
                }}
              >
                Share
              </span>
              , then tap{" "}
              <span
                style={{
                  fontWeight: "700",
                  color: "#CCCCCC",
                }}
              >
                &quot;Add to Home Screen&quot;
              </span>{" "}
              and tap{" "}
              <span
                style={{
                  fontWeight: "700",
                  color: "#CCCCCC",
                }}
              >
                Add
              </span>
            </>
          )}
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
          color: "rgba(201,168,76,0.6)",
          fontSize: "20px",
          cursor: "pointer",
          padding: "4px",
          lineHeight: 1,
          flexShrink: 0,
        }}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
