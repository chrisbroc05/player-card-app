import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import { API_BASE_URL, authHeaders } from "../config/api";
import { useAuth } from "../context/AuthContext";

export const SUPPORT_EMAIL = "support@prospectlegends.com";

const SUBJECT_OPTIONS = [
  { value: "card_question", label: "Question about my card" },
  { value: "payment_credits", label: "Payment or credits issue" },
  { value: "technical", label: "Technical problem" },
  { value: "animation_highlight", label: "Animation or highlight issue" },
  { value: "account", label: "Account issue" },
  { value: "partnership", label: "Partnership or business inquiry" },
  { value: "other", label: "Other" },
];

const MESSAGE_MAX = 1000;

function formatApiError(detail, fallback) {
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const msgs = detail.map((item) => (typeof item === "string" ? item : item?.msg || null)).filter(Boolean);
    return msgs.length ? msgs.join(" | ") : fallback;
  }
  return fallback;
}

export default function ContactPage() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("card_question");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [successEmail, setSuccessEmail] = useState("");

  useEffect(() => {
    if (user?.display_name) setName(user.display_name);
    if (user?.email) setEmail(user.email);
  }, [user?.display_name, user?.email]);

  const charCount = message.length;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccessEmail("");

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName) {
      setError("Please enter your name.");
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!trimmedMessage) {
      setError("Please enter a message.");
      return;
    }

    setBusy(true);
    try {
      const headers = { "Content-Type": "application/json", ...(token ? authHeaders(token) : {}) };
      const res = await fetch(`${API_BASE_URL}/contact`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          subject,
          message: trimmedMessage,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Could not send message."));

      setSuccessEmail(data.email || trimmedEmail);
      setMessage("");
      if (!user?.display_name) setName("");
      if (!user?.email) setEmail("");
    } catch (err) {
      setError(err.message || "Could not send message.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-appBg text-slate-100">
      <AppHeader />

      <main className="support-page">
        <div className="support-page__header">
          <button type="button" className="support-page__back" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>
          <div>
            <h1 className="support-page__title">Contact Us</h1>
            <p className="support-page__subtitle">We typically respond within 24-48 hours</p>
          </div>
        </div>

        <p className="support-page__help-link">
          Check our <Link to="/help">Help Center</Link> first — your question may already be answered.
        </p>

        {successEmail ? (
          <div className="support-page__success" role="status">
            Message sent! We&apos;ll get back to you at <strong>{successEmail}</strong> within 24-48 hours.
          </div>
        ) : null}

        <form className="contact-form" onSubmit={handleSubmit} noValidate>
          <div className="contact-form__field">
            <label className="contact-form__label" htmlFor="contact-name">
              Name
            </label>
            <input
              id="contact-name"
              type="text"
              className="contact-form__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>

          <div className="contact-form__field">
            <label className="contact-form__label" htmlFor="contact-email">
              Email
            </label>
            <input
              id="contact-email"
              type="email"
              className="contact-form__input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="contact-form__field">
            <label className="contact-form__label" htmlFor="contact-subject">
              Subject
            </label>
            <select
              id="contact-subject"
              className="contact-form__select"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              {SUBJECT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="contact-form__field">
            <label className="contact-form__label" htmlFor="contact-message">
              Message
            </label>
            <textarea
              id="contact-message"
              className="contact-form__textarea"
              rows={5}
              maxLength={MESSAGE_MAX}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
            <p className="contact-form__counter" aria-live="polite">
              {charCount}/{MESSAGE_MAX}
            </p>
          </div>

          {error ? <p className="contact-form__error">{error}</p> : null}

          <button type="submit" className="btn-primary contact-form__submit" disabled={busy}>
            {busy ? "Sending…" : "Send Message"}
          </button>
        </form>

        <section className="contact-direct">
          <h2 className="contact-direct__title">Direct contact</h2>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="contact-direct__email">
            <Mail className="h-4 w-4" aria-hidden />
            {SUPPORT_EMAIL}
          </a>
          <p className="contact-direct__note">
            For urgent payment issues, include your account email in the message.
          </p>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
