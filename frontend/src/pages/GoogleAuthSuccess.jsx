import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API_BASE_URL, authHeaders } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { clearBiometricRequired } from "../utils/activityTracker";

export default function GoogleAuthSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { applyAuthSession } = useAuth();

  useEffect(() => {
    let cancelled = false;

    async function completeGoogleLogin() {
      const token = searchParams.get("token");
      const isNew = searchParams.get("is_new") === "true";

      if (!token) {
        navigate("/login?error=google_failed", { replace: true });
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { ...authHeaders(token) },
        });
        if (!res.ok) throw new Error("Could not load user profile");
        const user = await res.json();
        if (cancelled) return;

        applyAuthSession(token, user);
        clearBiometricRequired();
        navigate(isNew ? "/studio" : "/", { replace: true });
      } catch {
        if (!cancelled) {
          navigate("/login?error=google_failed", { replace: true });
        }
      }
    }

    completeGoogleLogin();

    return () => {
      cancelled = true;
    };
  }, [applyAuthSession, navigate, searchParams]);

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
      <div
        style={{
          width: "40px",
          height: "3px",
          background: "rgba(201,168,76,0.2)",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: "40%",
            background: "linear-gradient(90deg, #C9A84C, #E8C56A)",
            borderRadius: "2px",
            animation: "googleAuthLoad 1s ease-in-out infinite",
          }}
        />
      </div>
      <style>{`
        @keyframes googleAuthLoad {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
}
