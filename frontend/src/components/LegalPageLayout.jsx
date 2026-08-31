import React from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "./AppHeader";
import AppFooter from "./AppFooter";

export function LegalSection({ title, children }) {
  return (
    <section className="legal-page__section">
      <h2 className="legal-page__section-title">{title}</h2>
      <div className="legal-page__section-body">{children}</div>
    </section>
  );
}

export default function LegalPageLayout({ title, lastUpdated, meta, children }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen text-slate-100" style={{ background: "#0A0A0A" }}>
      <AppHeader />
      <main className="legal-page">
        <button type="button" className="legal-page__back" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h1 className="legal-page__title">{title}</h1>
        <p className="legal-page__meta">Last updated: {lastUpdated}</p>
        {meta ? <div className="legal-page__meta-block">{meta}</div> : null}
        <div className="legal-page__content">{children}</div>
      </main>
      <AppFooter />
    </div>
  );
}
