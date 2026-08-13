import React from "react";
import { Link } from "react-router-dom";

/**
 * Catches render errors in child trees so route pages fail gracefully
 * instead of showing a blank screen.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("Card render error:", error, info?.componentStack);
  }

  handleRetry = () => {
    this.setState({ error: null });
    this.props.onRetry?.();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const cardId = this.props.cardId;
    const title = this.props.title || "Unable to load card. Please refresh the page.";

    return (
      <div
        className="rounded-2xl border border-rose-500/35 bg-rose-500/10 px-5 py-8 text-center"
        role="alert"
      >
        <p className="text-base font-medium text-rose-100">{title}</p>
        {cardId ? (
          <p className="mt-2 font-mono text-xs text-rose-200/80">Card ID: {cardId}</p>
        ) : null}
        <p className="mt-3 text-sm text-rose-200/70">
          Something went wrong while displaying this card. You can try again or return to your
          collection.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl btn-primary px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:opacity-90"
          >
            Refresh page
          </button>
          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-100 transition hover:border-white/35"
          >
            Try again
          </button>
          <Link
            to={this.props.backTo || "/my-collection"}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/20 bg-cardBg2 px-5 py-2.5 text-sm font-medium text-slate-100 transition hover:border-[var(--color-border-gold)]"
          >
            Go back to collection
          </Link>
        </div>
      </div>
    );
  }
}
