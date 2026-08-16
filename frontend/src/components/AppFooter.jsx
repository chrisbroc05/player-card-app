import React from "react";
import { Link } from "react-router-dom";

export default function AppFooter() {
  return (
    <footer className="app-footer">
      <nav className="app-footer__links" aria-label="Support links">
        <Link to="/help" className="app-footer__link">
          Help
        </Link>
        <span className="app-footer__sep" aria-hidden>
          ·
        </span>
        <Link to="/contact" className="app-footer__link">
          Contact
        </Link>
      </nav>
      <p className="app-footer__credit">Powered by LCB AI</p>
    </footer>
  );
}
