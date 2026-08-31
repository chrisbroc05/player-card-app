import React, { useEffect, useState } from "react";
import { API_BASE_URL, authHeaders } from "../config/api";
import { useAuth } from "../context/AuthContext";
import {
  BIOMETRIC_CREDENTIAL_ID_KEY,
  BIOMETRIC_ENABLED_KEY,
  isBiometricAvailable,
  parseOptionsResponse,
  parseRegistrationOptions,
  registrationCredentialToJSON,
} from "../utils/webauthn";

export function EnableBiometricPrompt({ onDismiss, onEnabled }) {
  const { token } = useAuth();
  const [supported, setSupported] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    isBiometricAvailable().then(setSupported);
  }, []);

  async function enableBiometric() {
    if (!token) return;
    setEnabling(true);
    setError("");
    try {
      const optionsRes = await fetch(`${API_BASE_URL}/auth/webauthn/register-options`, {
        method: "POST",
        headers: {
          ...authHeaders(token),
          "Content-Type": "application/json",
        },
      });
      if (!optionsRes.ok) {
        throw new Error("Could not start Face ID setup.");
      }
      const options = parseRegistrationOptions(await parseOptionsResponse(optionsRes));

      const credential = await navigator.credentials.create({
        publicKey: options,
      });

      const verifyRes = await fetch(`${API_BASE_URL}/auth/webauthn/register-verify`, {
        method: "POST",
        headers: {
          ...authHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registrationCredentialToJSON(credential)),
      });
      if (!verifyRes.ok) {
        const data = await verifyRes.json().catch(() => ({}));
        throw new Error(data?.detail || "Face ID setup failed.");
      }
      const verifyData = await verifyRes.json().catch(() => ({}));

      localStorage.setItem(BIOMETRIC_ENABLED_KEY, "true");
      localStorage.setItem(
        BIOMETRIC_CREDENTIAL_ID_KEY,
        verifyData.credential_id || credential.id
      );
      setEnabled(true);
      onEnabled?.();
    } catch (err) {
      setError(err?.message || "Face ID setup failed.");
    } finally {
      setEnabling(false);
    }
  }

  if (!supported) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        zIndex: 500,
      }}
    >
      <div
        style={{
          background: "#161616",
          border: "1px solid rgba(201,168,76,0.3)",
          borderRadius: "20px",
          padding: "32px 24px",
          width: "100%",
          maxWidth: "320px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "64px",
            height: "64px",
            border: "3px solid #C9A84C",
            borderRadius: "16px",
            margin: "0 auto 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "32px",
          }}
        >
          👤
        </div>

        <div
          style={{
            fontSize: "20px",
            fontWeight: "800",
            fontFamily: "Barlow Condensed, sans-serif",
            color: "#FFFFFF",
            letterSpacing: "1px",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}
        >
          Enable Face ID
        </div>

        <div
          style={{
            fontSize: "13px",
            color: "#888888",
            lineHeight: "1.5",
            marginBottom: "24px",
          }}
        >
          Log in instantly with Face ID next time — no password needed
        </div>

        {error ? (
          <p
            style={{
              color: "#f87171",
              fontSize: "13px",
              marginBottom: "12px",
            }}
          >
            {error}
          </p>
        ) : null}

        {enabled ? (
          <p style={{ color: "#4CAF50", fontSize: "14px", marginBottom: "12px" }}>
            Face ID enabled successfully!
          </p>
        ) : null}

        <button
          type="button"
          onClick={enableBiometric}
          disabled={enabling || enabled}
          style={{
            width: "100%",
            padding: "14px",
            background: enabling ? "rgba(201,168,76,0.4)" : "linear-gradient(135deg, #C9A84C, #E8C56A)",
            color: "#0A0A0A",
            border: "none",
            borderRadius: "12px",
            fontSize: "15px",
            fontWeight: "700",
            fontFamily: "Barlow Condensed, sans-serif",
            letterSpacing: "0.5px",
            cursor: enabling || enabled ? "wait" : "pointer",
            marginBottom: "10px",
          }}
        >
          {enabling ? "Setting up..." : enabled ? "Enabled" : "Enable Face ID"}
        </button>

        <button
          type="button"
          onClick={onDismiss}
          style={{
            width: "100%",
            padding: "12px",
            background: "transparent",
            color: "#666666",
            border: "none",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
