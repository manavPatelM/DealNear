import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

/* ─── Shared UI ──────────────────────────────────────────── */
export function Spinner() { return <div className="spinner" aria-hidden="true" />; }

export function Notice({ type = 'info', children }) {
  return <p className={`notice notice-${type}`} role="status">{children}</p>;
}

const statusMeta = {
  DRAFT: ['badge-draft', '✎ Draft'],
  PUBLISHED: ['badge-published', '● Published'],
  PAUSED: ['badge-paused', '⏸ Paused'],
  EXPIRED: ['badge-expired', '⌛ Expired'],
  REMOVED: ['badge-removed', '⛔ Removed'],
  PENDING: ['badge-paused', '⏳ Pending review'],
  VERIFIED: ['badge-published', '✓ Verified'],
  REJECTED: ['badge-removed', '✕ Rejected'],
  OPEN: ['badge-paused', 'Open'],
  DISMISSED: ['badge-draft', 'Dismissed'],
  ACTIONED: ['badge-removed', 'Actioned'],
  ENABLED: ['badge-published', 'Enabled'],
  DISABLED: ['badge-expired', 'Disabled'],
};
export function StatusBadge({ status }) {
  const [cls, label] = statusMeta[status] ?? ['badge-draft', status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-backdrop" id="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <h2 className="modal-title" id="modal-title">{title}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Prompts for a required free-text reason (store rejection, offer takedown). */
export function ReasonForm({ label, submitLabel, required = true, onSubmit, onCancel, loading, idPrefix }) {
  const [reason, setReason] = useState('');
  return (
    <form className="form-grid" onSubmit={(e) => { e.preventDefault(); onSubmit(reason.trim()); }}>
      <div className="field">
        <label htmlFor={`${idPrefix}-reason`}>{label}</label>
        <textarea id={`${idPrefix}-reason`} value={reason} onChange={(e) => setReason(e.target.value)} required={required} maxLength="500" />
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-danger" disabled={loading} id={`${idPrefix}-submit`}>
          {loading ? <Spinner /> : null} {submitLabel}
        </button>
      </div>
    </form>
  );
}

export function EmptyState({ icon, title, children, action }) {
  return (
    <div className="empty-state">
      {icon && <span className="empty-icon" aria-hidden="true">{icon}</span>}
      {title && <h3>{title}</h3>}
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function SkeletonCards({ count = 3 }) {
  return (
    <div className="offer-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => <div key={i} className="offer-card skeleton-card"><div className="skeleton" /></div>)}
    </div>
  );
}

export function PageHeading({ eyebrow, title, children }) {
  return (
    <header className="page-heading">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      {children && <p className="page-lead">{children}</p>}
    </header>
  );
}

export function NotFound({ title = 'Page not found', message = "The page you're looking for doesn't exist or has moved." }) {
  return (
    <div className="page page-narrow system-page">
      <span className="system-code">404</span>
      <h1>{title}</h1>
      <p className="page-lead">{message}</p>
      <div className="form-actions" style={{ justifyContent: 'center' }}>
        <Link className="btn btn-primary" to="/">Go home</Link>
        <Link className="btn btn-secondary" to="/explore">Explore offers</Link>
      </div>
    </div>
  );
}

export function Forbidden({ needed }) {
  return (
    <div className="page page-narrow system-page">
      <span className="system-code">403</span>
      <h1>Access denied</h1>
      <p className="page-lead">This area is for {needed} accounts. Sign in with the right account, or head back home.</p>
      <div className="form-actions" style={{ justifyContent: 'center' }}>
        <Link className="btn btn-primary" to="/">Go home</Link>
      </div>
    </div>
  );
}
