import React, { useEffect, useState } from 'react';
import { request } from './api.js';

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

/** Prompts for a required free-text reason (store rejection, offer takedown, report details). */
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

/**
 * Sign-in/registration card shared by every portal. `registerPath` is omitted for admins,
 * who cannot self-register; `expectedRole` stops users signing in to the wrong portal.
 */
export function AuthForm({ idPrefix, expectedRole, registerPath, copy, onAuth }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setNotice(null);
    try {
      const path = mode === 'login' ? '/api/auth/login' : registerPath;
      const result = await request(path, { method: 'POST', body: JSON.stringify({ email, password }) });
      if (result.role !== expectedRole) {
        setNotice({ type: 'error', text: copy.wrongRole });
        return;
      }
      onAuth(result.accessToken);
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  const registering = mode === 'register';
  return (
    <div className="card card-padded auth-card">
      <h2 style={{ marginBottom: '4px' }}>{registering ? copy.registerTitle : copy.loginTitle}</h2>
      <p className="muted-copy">{registering ? copy.registerSubtitle : copy.loginSubtitle}</p>
      {notice && <Notice type={notice.type}>{notice.text}</Notice>}
      <form className="form-grid" onSubmit={submit}>
        <div className="field">
          <label htmlFor={`${idPrefix}-email`}>Email address</label>
          <input id={`${idPrefix}-email`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
        </div>
        <div className="field">
          <label htmlFor={`${idPrefix}-pass`}>Password</label>
          <input id={`${idPrefix}-pass`} type="password" minLength="8" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Min. 8 characters" />
        </div>
        <button className="btn btn-primary btn-block btn-lg" disabled={loading} type="submit" id={`${idPrefix}-submit`}>
          {loading ? <Spinner /> : null}
          {registering ? copy.registerTitle : 'Sign in'}
        </button>
      </form>
      {registerPath && (
        <div className="auth-toggle">
          {registering ? 'Already have an account?' : copy.registerPrompt}
          <button className="btn-ghost btn inline-link" onClick={() => setMode(registering ? 'login' : 'register')}>
            {registering ? 'Sign in' : 'Register'}
          </button>
        </div>
      )}
    </div>
  );
}

