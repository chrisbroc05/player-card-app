import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../config/api";

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const state = searchParams.get("state");

    if (error) {
      window.location.href = "/login?error=google_failed";
      return;
    }

    if (code) {
      const params = new URLSearchParams();
      params.set("code", code);
      if (state) params.set("state", state);

      window.location.href = `${API_BASE_URL}/auth/google/callback?${params.toString()}`;
      return;
    }

    window.location.href = "/login?error=google_failed";
  }, [searchParams]);

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
        gap: "16px",
      }}
    >
      <img
        src="/prospect-legends-logo.png"
        alt="PL"
        style={{
          width: "64px",
          height: "64px",
          objectFit: "contain",
          borderRadius: "14px",
        }}
        onError={(e) => {
          e.target.style.display = "none";
        }}
      />
      <div
        style={{
          color: "#C9A84C",
          fontFamily: "Barlow Condensed, sans-serif",
          fontSize: "18px",
          fontWeight: "700",
          letterSpacing: "1px",
        }}
      >
        Signing you in...
      </div>
    </div>
  );
}
