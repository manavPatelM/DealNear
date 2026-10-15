import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { bearer, request } from './api.js';
import { categoryLabel, formatDate, REPORT_REASONS } from './lib/offers.js';
import { AuthForm, Modal, Notice, ReasonForm, Spinner, StatusBadge } from './ui.jsx';

const reasonLabel = (value) => REPORT_REASONS.find((r) => r.value === value)?.label ?? value;

function StoreReviewTab({ headers }) {
  const [status, setStatus] = useState('PENDING');
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await request(`/api/vendors/admin/stores?status=${status}&size=50`, { headers });
      setStores(result.stores ?? []);
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally { setLoading(false); }
  }, [headers, status]);

  useEffect(() => { load(); }, [load]);

  async function decide(store, action, reason) {
    setBusy(true); setNotice(null);
    try {
      await request(`/api/vendors/admin/stores/${store.id}/${action}`, {
        method: 'POST', headers, body: reason ? JSON.stringify({ reason }) : undefined,
      });
      setStores((list) => list.filter((s) => s.id !== store.id));
      setNotice({ type: 'success', text: `"${store.name}" ${action === 'verify' ? 'verified' : 'rejected'}.` });
      setRejecting(null);
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally { setBusy(false); }
  }

  return (
    <div>
      {notice && <Notice type={notice.type}>{notice.text}</Notice>}
      <div className="section-header">
        <span className="section-title">Store submissions</span>
        <select id="admin-store-status" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by verification status">
          <option value="PENDING">Pending review</option>
          <option value="VERIFIED">Verified</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>
      {loading && <div className="center-pad"><Spinner /></div>}
      {!loading && stores.length === 0 && (
        <div className="empty-state"><span className="empty-icon">✅</span><p>No stores in this queue.</p></div>
      )}
      {!loading && stores.length > 0 && (
        <div className="list-items">
          {stores.map((store) => (
            <div className="list-item" key={store.id} id={`admin-store-${store.id}`}>
              <div className="list-item-body">
                <div className="list-item-heading">
                  <div className="list-item-title">{store.name}</div>
                  <StatusBadge status={store.verificationStatus} />
                </div>
                <div className="list-item-meta">
                  {store.address}, {store.city} · {store.latitude.toFixed(4)}, {store.longitude.toFixed(4)} · submitted {formatDate(store.createdAt)}
                </div>
                {store.verificationNote && <div className="moderation-note">Note: {store.verificationNote}</div>}
              </div>
              <div className="list-item-actions">
                {store.verificationStatus !== 'VERIFIED' && (
                  <button className="btn btn-success btn-sm" disabled={busy} onClick={() => decide(store, 'verify')} id={`verify-store-${store.id}`}>Verify</button>
                )}
                {store.verificationStatus !== 'REJECTED' && (
                  <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => setRejecting(store)} id={`reject-store-${store.id}`}>
                    {store.verificationStatus === 'VERIFIED' ? 'Revoke' : 'Reject'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {rejecting && (
        <Modal title={`Reject: ${rejecting.name}`} onClose={() => setRejecting(null)}>
          <ReasonForm idPrefix="reject-store" label="Reason shown to the vendor" submitLabel="Reject store"
            loading={busy} onCancel={() => setRejecting(null)} onSubmit={(reason) => decide(rejecting, 'reject', reason)} />
        </Modal>
      )}
    </div>
  );
}

function ReportsTab({ headers }) {
  const [status, setStatus] = useState('OPEN');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await request(`/api/offers/admin/reports?status=${status}&size=50`, { headers });
      setReports(result.reports ?? []);
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally { setLoading(false); }
  }, [headers, status]);

  useEffect(() => { load(); }, [load]);

  async function dismiss(report) {
    setBusy(true); setNotice(null);
    try {
      await request(`/api/offers/admin/reports/${report.id}/dismiss`, { method: 'POST', headers, body: JSON.stringify({}) });
      setNotice({ type: 'success', text: 'Report dismissed.' });
      await load();
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally { setBusy(false); }
  }

  async function removeOffer(report, reason) {
    setBusy(true); setNotice(null);
    try {
      await request(`/api/offers/admin/offers/${report.offerId}/remove`, { method: 'POST', headers, body: JSON.stringify({ reason }) });
      setNotice({ type: 'success', text: 'Offer removed and related reports closed.' });
      setRemoving(null);
      await load();
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally { setBusy(false); }
  }

  return (
    <div>
      {notice && <Notice type={notice.type}>{notice.text}</Notice>}
      <div className="section-header">
        <span className="section-title">Reported offers</span>
        <select id="admin-report-status" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by report status">
          <option value="OPEN">Open</option>
          <option value="ACTIONED">Actioned</option>
          <option value="DISMISSED">Dismissed</option>
        </select>
      </div>
      {loading && <div className="center-pad"><Spinner /></div>}
      {!loading && reports.length === 0 && (
        <div className="empty-state"><span className="empty-icon">🧹</span><p>No reports in this queue.</p></div>
      )}
      {!loading && reports.length > 0 && (
        <div className="list-items">
          {reports.map((report) => (
            <div className="list-item" key={report.id} id={`report-${report.id}`}>
              <div className="list-item-body">
                <div className="list-item-heading">
                  <div className="list-item-title">{report.offer?.title ?? 'Deleted offer'}</div>
                  {report.offer && <StatusBadge status={report.offer.status} />}
                </div>
                <div className="list-item-meta">
                  {reasonLabel(report.reason)} · reported {formatDate(report.createdAt)}
                  {report.offer && ` · ${categoryLabel(report.offer.category)} · store ${report.offer.storeId.slice(0, 8)}`}
                </div>
                {report.details && <div className="moderation-note">“{report.details}”</div>}
                {report.offer?.description && <div className="list-item-meta">{report.offer.description}</div>}
                {report.resolutionNote && <div className="moderation-note">Resolution: {report.resolutionNote}</div>}
              </div>
              {report.status === 'OPEN' && (
                <div className="list-item-actions">
                  <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => dismiss(report)} id={`dismiss-report-${report.id}`}>Dismiss</button>
                  {report.offer && report.offer.status !== 'REMOVED' && (
                    <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => setRemoving(report)} id={`remove-offer-${report.id}`}>Remove offer</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {removing && (
        <Modal title={`Remove: ${removing.offer?.title}`} onClose={() => setRemoving(null)}>
          <ReasonForm idPrefix="remove-offer" label="Reason shown to the vendor" submitLabel="Remove offer"
            loading={busy} onCancel={() => setRemoving(null)} onSubmit={(reason) => removeOffer(removing, reason)} />
        </Modal>
      )}
    </div>
  );
}

export default function AdminPortal({ auth, onAuth }) {
  const [tab, setTab] = useState('stores');
  const headers = useMemo(() => bearer(auth.token), [auth.token]);

  if (auth.role !== 'ADMIN') {
    return (
      <div className="page">
        <div className="hero">
          <div className="hero-inner">
            <span className="eyebrow">Admin</span>
            <h1>Keep DealNear trustworthy.</h1>
            <p className="hero-subtitle">Verify store submissions and moderate reported offers.</p>
          </div>
        </div>
        {auth.token ? (
          <Notice type="info">You are signed in with a non-admin account. Sign out to use the admin portal.</Notice>
        ) : (
          <AuthForm
            idPrefix="a"
            expectedRole="ADMIN"
            onAuth={onAuth}
            copy={{
              loginTitle: 'Admin sign in', loginSubtitle: 'Admin accounts are provisioned by operators; there is no self-registration.',
              wrongRole: 'This account does not have admin access.',
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <div className="tabs">
        <button className={`tab ${tab === 'stores' ? 'active' : ''}`} onClick={() => setTab('stores')} id="tab-admin-stores">🏪 Store verification</button>
        <button className={`tab ${tab === 'reports' ? 'active' : ''}`} onClick={() => setTab('reports')} id="tab-admin-reports">⚑ Reports</button>
      </div>
      {tab === 'stores' && <StoreReviewTab headers={headers} />}
      {tab === 'reports' && <ReportsTab headers={headers} />}
    </div>
  );
}
