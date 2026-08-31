import React, { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { clearBiometricRequired } from "../utils/activityTracker";
import {
  BIOMETRIC_CREDENTIAL_ID_KEY,
  authenticationCredentialToJSON,
  isBiometricAvailable,
  parseAuthenticationOptions,
  parseOptionsResponse,
} from "../utils/webauthn";

const MAX_ATTEMPTS = 3;

export function BiometricGate({ onSuccess, onFallback }) {
  const { applyAuthSession } = useAuth();
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState(null);
  const attemptsRef = useRef(0);
  const autoStartedRef = useRef(false);

  const handleTooManyAttempts = useCallback(() => {
    setError("Too many attempts");
    window.setTimeout(() => {
      onFallback();
    }, 1200);
  }, [onFallback]);

  const authenticate = useCallback(async () => {
    if (authenticating) return;

    try {
      setAuthenticating(true);
      setError(null);

      const available = await isBiometricAvailable();
      if (!available) {
        onFallback();
        return;
      }

      const credentialId = localStorage.getItem(BIOMETRIC_CREDENTIAL_ID_KEY);
      const optionsRes = await fetch(`${API_BASE_URL}/auth/webauthn/login-options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential_id: credentialId || null }),
      });
      if (!optionsRes.ok) {
        throw new Error("Could not start Face ID authentication.");
      }

      const options = parseAuthenticationOptions(await parseOptionsResponse(optionsRes), credentialId);
      const credential = await navigator.credentials.get({
        publicKey: options,
      });

      const verifyRes = await fetch(`${API_BASE_URL}/auth/webauthn/login-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authenticationCredentialToJSON(credential)),
      });
      const data = await verifyRes.json().catch(() => ({}));

      if (!verifyRes.ok || !data.access_token) {
        throw new Error(data?.detail || "Authentication failed");
      }

      applyAuthSession(data.access_token, data.user);
      clearBiometricRequired();
      onSuccess();
    } catch (err) {
      attemptsRef.current += 1;

      if (attemptsRef.current >= MAX_ATTEMPTS) {
        handleTooManyAttempts();
        return;
      }

      if (err?.name === "NotAllowedError") {
        setError("Face ID was cancelled");
      } else {
        setError("Authentication failed");
      }
    } finally {
      setAuthenticating(false);
    }
  }, [applyAuthSession, authenticating, handleTooManyAttempts, onFallback, onSuccess]);

  useEffect(() => {
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    authenticate();
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0A0A0A",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        zIndex: 9000,
      }}
    >
      <img
        src="/prospect-legends-logo.png"
        alt="PL"
        style={{
          width: "72px",
          height: "72px",
          objectFit: "contain",
          borderRadius: "16px",
          marginBottom: "32px",
        }}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />

      <div
        style={{
          fontSize: "24px",
          fontWeight: "800",
          fontFamily: "Barlow Condensed, sans-serif",
          color: "#FFFFFF",
          letterSpacing: "1px",
          textTransform: "uppercase",
          marginBottom: "8px",
          textAlign: "center",
        }}
      >
        Welcome Back
      </div>

      <div
        style={{
          fontSize: "13px",
          color: "#888888",
          marginBottom: "40px",
          textAlign: "center",
        }}
      >
        Authenticate to continue
      </div>

      <div
        style={{
          width: "80px",
          height: "80px",
          border: "2px solid rgba(201,168,76,0.4)",
          borderRadius: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "24px",
          background: "rgba(201,168,76,0.05)",
        }}
      >
        <span style={{ fontSize: "40px" }}>👤</span>
      </div>

      <button
        type="button"
        onClick={authenticate}
        disabled={authenticating}
        style={{
          background: authenticating ? "rgba(201,168,76,0.3)" : "linear-gradient(135deg, #C9A84C, #E8C56A)",
          color: "#0A0A0A",
          border: "none",
          borderRadius: "12px",
          padding: "14px 40px",
          fontSize: "15px",
          fontWeight: "700",
          fontFamily: "Barlow Condensed, sans-serif",
          cursor: authenticating ? "wait" : "pointer",
          marginBottom: "16px",
        }}
      >
        {authenticating ? "Authenticating..." : "Use Face ID"}
      </button>

      {error ? (
        <div
          style={{
            color: "#EF5350",
            fontSize: "13px",
            marginBottom: "16px",
            textAlign: "center",
          }}
        >
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={onFallback}
        style={{
          background: "transparent",
          border: "none",
          color: "#555555",
          fontSize: "13px",
          cursor: "pointer",
          padding: "8px",
        }}
      >
        Use password instead
      </button>
    </div>
  );
}
