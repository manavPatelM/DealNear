import React, { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { request } from '../api.js';
import { useAuth, useCategories, useToast } from '../state.jsx';
import { categoryLabel, formatDate, REPORT_REASONS } from '../lib/offers.js';
import { EmptyState, Modal, Notice, PageHeading, ReasonForm, Spinner, StatusBadge } from '../ui.jsx';

const reasonLabel = (value) => REPORT_REASONS.find((r) => r.value === value)?.label ?? value;

export function AdminLayout() {
  return (
    <div className="page">
      <PageHeading eyebrow="Admin" title="Keep DealNear trustworthy">Verify businesses, moderate reported offers and manage categories.</PageHeading>
      <nav className="tabs" aria-label="Admin sections">
        <NavLink to="/admin/vendors" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`} id="tab-admin-stores">🏪 Store verification</NavLink>
        <NavLink to="/admin/reports" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`} id="tab-admin-reports">⚑ Reports</NavLink>
        <NavLink to="/admin/categories" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`} id="tab-admin-categories">🗂️ Categories</NavLink>
      </nav>
      <Outlet />
    </div>
  );
}

export function StoreReviewPage() {
  const { headers } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState('PENDING');
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await request(`/api/vendors/admin/stores?status=${status}&size=50`, { headers });
      setStores(result.stores ?? []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }, [headers, status]);

  useEffect(() => { load(); }, [load]);

  async function decide(store, action, reason) {
    setBusy(true); setError(null);
    try {
      await request(`/api/vendors/admin/stores/${store.id}/${action}`, {
        method: 'POST', headers, body: reason ? JSON.stringify({ reason }) : undefined,
      });
      setStores((list) => list.filter((s) => s.id !== store.id));
      toast(`"${store.name}" ${action === 'verify' ? 'verified' : 'rejected'}`);
      setRejecting(null);
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  }

  return (
    <div>
      {error && <Notice type="error">{error}</Notice>}
      <div className="section-header">
        <h2 className="section-title">Store submissions</h2>
        <select id="admin-store-status" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by verification status">
          <option value="PENDING">Pending review</option>
          <option value="VERIFIED">Verified</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>
      {loading ? <div className="center-pad"><Spinner /></div> : stores.length === 0 ? (
        <EmptyState icon="✅" title="Nothing to review">No stores in this queue.</EmptyState>
      ) : (
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

export function ReportsPage() {
  const { headers } = useAuth();
  const { categories } = useCategories();
  const toast = useToast();
  const [status, setStatus] = useState('OPEN');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await request(`/api/offers/admin/reports?status=${status}&size=50`, { headers });
      setReports(result.reports ?? []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }, [headers, status]);

  useEffect(() => { load(); }, [load]);

  async function dismiss(report) {
    setBusy(true);
    try {
      await request(`/api/offers/admin/reports/${report.id}/dismiss`, { method: 'POST', headers, body: JSON.stringify({}) });
      toast('Report dismissed');
      await load();
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  }

  async function removeOffer(report, reason) {
    setBusy(true);
    try {
      await request(`/api/offers/admin/offers/${report.offerId}/remove`, { method: 'POST', headers, body: JSON.stringify({ reason }) });
      toast('Offer removed and related reports closed');
      setRemoving(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  }

  return (
    <div>
      {error && <Notice type="error">{error}</Notice>}
      <div className="section-header">
        <h2 className="section-title">Reported offers</h2>
        <select id="admin-report-status" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by report status">
          <option value="OPEN">Open</option>
          <option value="ACTIONED">Actioned</option>
          <option value="DISMISSED">Dismissed</option>
        </select>
      </div>
      {loading ? <div className="center-pad"><Spinner /></div> : reports.length === 0 ? (
        <EmptyState icon="🧹" title="Queue is clear">No reports in this queue.</EmptyState>
      ) : (
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
                  {report.offer && ` · ${categoryLabel(categories, report.offer.category)}`}
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

const EMPTY_CATEGORY = { code: '', slug: '', name: '', icon: '', description: '', parentCode: '', sortOrder: 0 };

function slugify(value) {
  return value.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-');
}

function CategoryForm({ initial, parents, onSave, onCancel, busy, error }) {
  const editing = Boolean(initial?.id);
  const [form, setForm] = useState({ ...EMPTY_CATEGORY, ...initial, parentCode: initial?.parentCode ?? '' });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function submit(e) {
    e.preventDefault();
    const payload = {
      slug: form.slug.trim(), name: form.name.trim(), icon: form.icon.trim(), description: form.description?.trim() ?? '',
      parentCode: form.parentCode, sortOrder: Number(form.sortOrder) || 0,
    };
    if (!editing) {
      payload.code = form.code.trim().toUpperCase();
      if (!payload.parentCode) delete payload.parentCode;
    }
    onSave(payload);
  }

  return (
    <form className="form-grid" onSubmit={submit} id="category-form">
      {error && <Notice type="error">{error}</Notice>}
      <div className="field">
        <label htmlFor="cat-name">Name</label>
        <input id="cat-name" value={form.name} maxLength="80" required
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: editing ? f.slug : slugify(e.target.value) }))} />
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="cat-code">Code</label>
          <input id="cat-code" value={form.code} onChange={set('code')} required={!editing} disabled={editing}
            pattern="[A-Za-z][A-Za-z_]{1,31}" title="Letters and underscores, 2–32 characters" />
          <span className="field-hint">{editing ? 'Codes are permanent; offers store them.' : 'For example PET_CARE. Cannot be changed later.'}</span>
        </div>
        <div className="field">
          <label htmlFor="cat-slug">URL slug</label>
          <input id="cat-slug" value={form.slug} onChange={set('slug')} required maxLength="64" pattern="[a-z0-9]+(-[a-z0-9]+)*" title="Lowercase letters, numbers and dashes" />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="cat-icon">Icon (emoji)</label>
          <input id="cat-icon" value={form.icon ?? ''} onChange={set('icon')} maxLength="16" />
        </div>
        <div className="field">
          <label htmlFor="cat-order">Sort order</label>
          <input id="cat-order" type="number" min="0" max="100000" value={form.sortOrder} onChange={set('sortOrder')} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="cat-parent">Parent category</label>
        <select id="cat-parent" value={form.parentCode} onChange={set('parentCode')}>
          <option value="">None (top level)</option>
          {parents.filter((p) => p.code !== form.code).map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="cat-desc">Description</label>
        <textarea id="cat-desc" value={form.description ?? ''} onChange={set('description')} maxLength="500" />
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={busy} id="save-category-btn">{busy ? <Spinner /> : null} {editing ? 'Save changes' : 'Create category'}</button>
      </div>
    </form>
  );
}

export function CategoriesAdminPage() {
  const { headers } = useAuth();
  const { reload: reloadPublic } = useCategories();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // null | {} | category
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await request('/api/categories/admin', { headers });
      setItems(result.categories ?? []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }, [headers]);

  useEffect(() => { load(); }, [load]);

  async function save(payload) {
    setBusy(true); setError(null);
    try {
      if (editing?.id) {
        await request(`/api/categories/${editing.id}`, { method: 'PATCH', headers, body: JSON.stringify(payload) });
        toast('Category updated');
      } else {
        await request('/api/categories', { method: 'POST', headers, body: JSON.stringify(payload) });
        toast('Category created');
      }
      setEditing(null);
      await Promise.all([load(), reloadPublic()]);
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  }

  async function toggle(category) {
    setError(null);
    try {
      await request(`/api/categories/${category.id}`, { method: 'PATCH', headers, body: JSON.stringify({ enabled: !category.enabled }) });
      toast(category.enabled ? `"${category.name}" disabled` : `"${category.name}" enabled`);
      await Promise.all([load(), reloadPublic()]);
    } catch (err) {
      setError(err.message);
    }
  }

  const parents = items.filter((c) => !c.parentCode);
  const ordered = parents.flatMap((p) => [p, ...items.filter((c) => c.parentCode === p.code)]);

  return (
    <div>
      {error && <Notice type="error">{error}</Notice>}
      <div className="section-header">
        <h2 className="section-title">Categories</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing({})} id="create-category-btn">+ New category</button>
      </div>
      <p className="muted-copy">Disabled categories disappear from navigation and can't be used for new offers. Existing offers keep their category.</p>
      {loading ? <div className="center-pad"><Spinner /></div> : (
        <div className="list-items">
          {ordered.map((c) => (
            <div className={`list-item ${c.parentCode ? 'list-item-child' : ''}`} key={c.id} id={`category-row-${c.code}`}>
              <div className="list-item-body">
                <div className="list-item-heading">
                  <div className="list-item-title">{c.icon} {c.name}</div>
                  <StatusBadge status={c.enabled ? 'ENABLED' : 'DISABLED'} />
                </div>
                <div className="list-item-meta">{c.code} · /categories/{c.slug} · order {c.sortOrder}</div>
              </div>
              <div className="list-item-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => setEditing(c)} id={`edit-category-${c.code}`}>Edit</button>
                <button className="btn btn-ghost btn-sm" onClick={() => toggle(c)} id={`toggle-category-${c.code}`}>{c.enabled ? 'Disable' : 'Enable'}</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <Modal title={editing.id ? `Edit: ${editing.name}` : 'New category'} onClose={() => setEditing(null)}>
          <CategoryForm initial={editing} parents={parents} onSave={save} onCancel={() => { setEditing(null); setError(null); }} busy={busy} error={error} />
        </Modal>
      )}
    </div>
  );
}
