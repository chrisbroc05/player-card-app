import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, Search, X } from "lucide-react";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import { FAQ_SECTIONS } from "../data/faqContent";

function FaqItem({ item, open, onToggle }) {
  return (
    <div className={`faq-item${open ? " faq-item--open" : ""}`}>
      <button type="button" className="faq-item__question" onClick={onToggle} aria-expanded={open}>
        <span>{item.question}</span>
        <ChevronDown className="faq-item__chevron" aria-hidden />
      </button>
      <div className="faq-item__answer-wrap">
        <div className="faq-item__answer">{item.answer}</div>
      </div>
    </div>
  );
}

export default function HelpPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [openIds, setOpenIds] = useState(() => new Set());

  const normalizedQuery = query.trim().toLowerCase();

  const filteredSections = useMemo(() => {
    if (!normalizedQuery) return FAQ_SECTIONS;

    return FAQ_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.question.toLowerCase().includes(normalizedQuery) ||
          item.answer.toLowerCase().includes(normalizedQuery)
      ),
    })).filter((section) => section.items.length > 0);
  }, [normalizedQuery]);

  const totalMatches = filteredSections.reduce((sum, section) => sum + section.items.length, 0);

  function toggleItem(id) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-appBg text-slate-100">
      <AppHeader />

      <main className="support-page help-page">
        <div className="support-page__header">
          <button type="button" className="support-page__back" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>
          <div>
            <h1 className="support-page__title">Help Center</h1>
            <p className="support-page__subtitle">Find answers to common questions</p>
          </div>
        </div>

        <div className="help-search">
          <Search className="help-search__icon" aria-hidden />
          <input
            type="search"
            className="help-search__input"
            placeholder="Search help articles…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search FAQ"
          />
          {query ? (
            <button
              type="button"
              className="help-search__clear"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>

        {normalizedQuery && totalMatches === 0 ? (
          <p className="help-page__empty">No results found for &ldquo;{query.trim()}&rdquo;</p>
        ) : null}

        <div className="help-sections">
          {filteredSections.map((section) => (
            <section key={section.id} className="help-section">
              <h2 className="help-section__label">{section.label}</h2>
              <div className="help-section__items">
                {section.items.map((item) => (
                  <FaqItem
                    key={item.id}
                    item={item}
                    open={openIds.has(item.id) || Boolean(normalizedQuery)}
                    onToggle={() => toggleItem(item.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="help-page__contact">
          Still need help? <Link to="/contact">Contact our support team</Link>
        </p>
      </main>

      <AppFooter />
    </div>
  );
}
