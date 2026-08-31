import React from "react";

export default function LogoutConfirmModal({ onClose, onConfirm }) {
  return (
    <div className="settings-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="logout-modal-title" className="settings-modal__title">
          Log Out
        </h3>
        <p className="settings-modal__hint">Are you sure you want to log out?</p>
        <div className="settings-modal__actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={onConfirm}>
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
