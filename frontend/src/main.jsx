import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { bearer, request, UNAUTHORIZED_EVENT } from './api.js';
import { authFromToken, clearToken, loadAuth, parseToken, saveToken, SIGNED_OUT } from './lib/auth.js';
import { CATEGORIES, categoryLabel, displayStatus, formatDate, REPORT_REASONS, vendorActions } from './lib/offers.js';
import AdminPortal from './AdminPortal.jsx';
import { AuthForm, Modal, Notice, Spinner, StatusBadge } from './ui.jsx';

function CategorySelect({ id, value, onChange, includeAll = false, required = false }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} required={required}>
      {includeAll && <option value="">All categories</option>}
      {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
    </select>
  );
}

/* ═══════════════════════════════════════════════════════════
   CUSTOMER PORTAL
═══════════════════════════════════════════════════════════ */

function DiscoverySearch({ onResults, loading, setLoading }) {
  const [mode, setMode] = useState('nearby');
  const [lat, setLat] = useState('40.7128');
  const [lng, setLng] = useState('-74.0060');
  const [radius, setRadius] = useState('10');
  const [category, setCategory] = useState('');
  const [notice, setNotice] = useState(null);

  function useMyLocation() {
    if (!navigator.geolocation) { setNotice({ type: 'error', text: 'Geolocation not supported.' }); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude.toFixed(6)); setLng(pos.coords.longitude.toFixed(6)); setNotice(null); },
      () => setNotice({ type: 'error', text: 'Could not get location. Enter coordinates manually.' })
    );
  }

  async function search(e) {
    e.preventDefault();
    setLoading(true); setNotice(null);
    try {
      const params = new URLSearchParams({ size: '50' });
      if (category) params.set('category', category);
      let path;
      if (mode === 'nearby') {
        params.set('latitude', lat); params.set('longitude', lng); params.set('radiusKm', radius);
        path = `/api/discovery/offers?${params}`;
      } else {
        path = `/api/offers/public?${params}`;
      }
      const result = await request(path);
      const offers = result.offers ?? [];
      onResults(offers, mode);
      if (offers.length === 0) {
        setNotice({ type: 'info', text: mode === 'nearby' ? 'No active offers found in this area. Try a larger radius or another category.' : 'No active offers match this category yet.' });
      }
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card card-padded" style={{ marginBottom: '32px' }}>
      <div className="card-header">
        <div>
          <span className="eyebrow">Discovery</span>
          <div className="card-title">{mode === 'nearby' ? 'Find offers near you' : 'Browse all active offers'}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className={`btn btn-sm ${mode === 'nearby' ? 'btn-primary' : 'btn-secondary'}`} type="button" onClick={() => setMode('nearby')} id="mode-nearby-btn">Near me</button>
          <button className={`btn btn-sm ${mode === 'all' ? 'btn-primary' : 'btn-secondary'}`} type="button" onClick={() => setMode('all')} id="mode-all-btn">Browse all</button>
        </div>
      </div>
      {notice && <Notice type={notice.type}>{notice.text}</Notice>}
      <form className="discovery-search" onSubmit={search}>
        {mode === 'nearby' && (
          <>
            <div className="field">
              <label htmlFor="disc-lat">Latitude</label>
              <input id="disc-lat" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="disc-lng">Longitude</label>
              <input id="disc-lng" inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="disc-radius">Radius (km, max 50)</label>
              <input id="disc-radius" type="number" min="0.1" max="50" step="0.1" value={radius} onChange={(e) => setRadius(e.target.value)} required />
            </div>
          </>
        )}
        <div className="field">
          <label htmlFor="disc-category">Category</label>
          <CategorySelect id="disc-category" value={category} onChange={setCategory} includeAll />
        </div>
        <button className="btn btn-primary" disabled={loading} type="submit" id="search-offers-btn">
          {loading ? <Spinner /> : '🔍'} Search
        </button>
        {mode === 'nearby' && (
          <button className="btn btn-secondary" onClick={useMyLocation} type="button" id="use-location-btn">📍 Use my location</button>
        )}
      </form>
    </div>
  );
}

function OfferCard({ offer, saved, canSave, onToggleSave, onOpen }) {
  return (
    <article className="offer-card">
      <div className="offer-card-meta">
        <span className="distance-tag">
          {typeof offer.distanceKm === 'number' ? `${offer.distanceKm.toFixed(1)} km away` : categoryLabel(offer.category)}
        </span>
        {canSave && (
          <button className={`save-btn ${saved ? 'saved' : ''}`} onClick={() => onToggleSave(offer.id)}
            aria-label={saved ? 'Unsave offer' : 'Save offer'} id={`save-btn-${offer.id}`}>
            {saved ? '♥' : '♡'}
          </button>
        )}
      </div>
      <p className="offer-store">{offer.storeName} · {offer.storeCity}</p>
      <h3 className="offer-title">{offer.title}</h3>
      <p className="offer-desc">{offer.description}</p>
      {offer.endAt && <p className="offer-validity">Valid until {formatDate(offer.endAt)}</p>}
      <button className="btn btn-secondary btn-sm" onClick={() => onOpen(offer.id)} id={`details-btn-${offer.id}`}>View details</button>
    </article>
  );
}

/** Offer details plus the store's other live offers, and a report form for signed-in customers. */
function OfferDetail({ offerId, auth, saved, onToggleSave, onOpen }) {
  const [offer, setOffer] = useState(null);
  const [storeOffers, setStoreOffers] = useState([]);
  const [error, setError] = useState(null);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState('MISLEADING');
  const [details, setDetails] = useState('');
  const [reportNotice, setReportNotice] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setOffer(null); setError(null); setReporting(false); setReportNotice(null);
    (async () => {
      try {
        const loaded = await request(`/api/offers/public/${offerId}`);
        if (cancelled) return;
        setOffer(loaded);
        const others = await request(`/api/offers/public?storeId=${loaded.storeId}&size=10`);
        if (!cancelled) setStoreOffers((others.offers ?? []).filter((o) => o.id !== offerId));
      } catch (err) {
        if (!cancelled) setError(err.message === 'Offer not found' ? 'This offer is no longer available.' : err.message);
      }
    })();
    return () => { cancelled = true; };
  }, [offerId]);

  async function submitReport(e) {
    e.preventDefault();
    try {
      await request(`/api/offers/${offerId}/reports`, {
        method: 'POST', headers: bearer(auth.token), body: JSON.stringify({ reason, details }),
      });
      setReportNotice({ type: 'success', text: 'Thanks — our team will review this offer.' });
      setReporting(false);
    } catch (err) {
      setReportNotice({ type: 'error', text: err.message });
    }
  }

  if (error) return <Notice type="error">{error}</Notice>;
  if (!offer) return <div className="center-pad"><Spinner /></div>;
  const isCustomer = auth.role === 'CUSTOMER';
  return (
    <div className="offer-detail">
      <div className="detail-meta">
        <span className="badge badge-draft">{categoryLabel(offer.category)}</span>
        <span className="muted-copy">Valid {formatDate(offer.startAt)} – {formatDate(offer.endAt)}</span>
      </div>
      <p className="offer-store">{offer.storeName} · {offer.storeCity}</p>
      <p className="detail-description">{offer.description}</p>

      <div className="form-actions">
        {isCustomer && (
          <button className="btn btn-secondary btn-sm" onClick={() => onToggleSave(offer.id)} id="detail-save-btn">
            {saved ? '♥ Saved' : '♡ Save offer'}
          </button>
        )}
        {isCustomer && !reporting && (
          <button className="btn btn-ghost btn-sm" onClick={() => setReporting(true)} id="report-offer-btn">⚑ Report</button>
        )}
      </div>
      {!isCustomer && <p className="muted-copy">Sign in as a customer to save or report offers.</p>}
      {reportNotice && <Notice type={reportNotice.type}>{reportNotice.text}</Notice>}
      {reporting && (
        <form className="form-grid report-form" onSubmit={submitReport}>
          <div className="field">
            <label htmlFor="report-reason">What's wrong with this offer?</label>
            <select id="report-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
              {REPORT_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="report-details">Details (optional)</label>
            <textarea id="report-details" value={details} onChange={(e) => setDetails(e.target.value)} maxLength="500" />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReporting(false)}>Cancel</button>
            <button type="submit" className="btn btn-danger btn-sm" id="submit-report-btn">Send report</button>
          </div>
        </form>
      )}

      <h3 className="detail-subheading">More from {offer.storeName}</h3>
      {storeOffers.length === 0 ? (
        <p className="muted-copy">No other active offers from this store.</p>
      ) : (
        <ul className="saved-list">
          {storeOffers.map((o) => (
            <li key={o.id} className="saved-item">
              <span>{o.title} <span className="muted-copy">· until {formatDate(o.endAt)}</span></span>
              <button className="btn btn-secondary btn-sm" onClick={() => onOpen(o.id)}>View</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SavedOffersPanel({ savedRefs, onToggleSave, onOpen }) {
  const [details, setDetails] = useState({});
  const idsKey = savedRefs.map((s) => s.offerId).join(',');

  useEffect(() => {
    // The public listing accepts up to 50 ids; older saved references beyond that show as IDs.
    const ids = savedRefs.slice(0, 50).map((s) => s.offerId);
    if (ids.length === 0) { setDetails({}); return; }
    request(`/api/offers/public?size=50&ids=${ids.join(',')}`)
      .then((result) => setDetails(Object.fromEntries((result.offers ?? []).map((o) => [o.id, o]))))
      .catch(() => { /* keep showing references */ });
  }, [idsKey]);

  return (
    <div className="card card-padded" style={{ marginBottom: '32px' }}>
      <div className="card-header">
        <div>
          <span className="eyebrow">Your List</span>
          <div className="card-title">Saved offers <span className="badge badge-draft" style={{ marginLeft: 6 }}>{savedRefs.length}</span></div>
        </div>
      </div>
      {savedRefs.length === 0 ? (
        <p className="muted-copy">You haven't saved any offers yet. Tap ♡ on an offer to keep it here.</p>
      ) : (
        <ul className="saved-list">
          {savedRefs.map((saved) => {
            const offer = details[saved.offerId];
            return (
              <li key={saved.id} className="saved-item">
                {offer ? (
                  <span><strong>{offer.title}</strong> <span className="muted-copy">· {offer.storeName} · until {formatDate(offer.endAt)}</span></span>
                ) : (
                  <span className="muted-copy">No longer available</span>
                )}
                <span className="list-item-actions">
                  {offer && <button className="btn btn-secondary btn-sm" onClick={() => onOpen(saved.offerId)}>View</button>}
                  <button className="btn btn-danger btn-sm" onClick={() => onToggleSave(saved.offerId)} id={`remove-saved-${saved.offerId}`}>Remove</button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CustomerPortal({ auth, onAuth }) {
  const [offers, setOffers] = useState([]);
  const [resultMode, setResultMode] = useState('nearby');
  const [savedRefs, setSavedRefs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openOfferId, setOpenOfferId] = useState(null);
  const isCustomer = auth.role === 'CUSTOMER';
  const savedIds = useMemo(() => new Set(savedRefs.map((s) => s.offerId)), [savedRefs]);

  const loadSaved = useCallback(async () => {
    if (!isCustomer) { setSavedRefs([]); return; }
    try {
      const result = await request('/api/auth/saved-offers', { headers: bearer(auth.token) });
      setSavedRefs(result.savedOffers ?? []);
    } catch { /* keep current list */ }
  }, [auth.token, isCustomer]);

  useEffect(() => { loadSaved(); }, [loadSaved]);

  async function toggleSave(offerId) {
    if (!isCustomer) return;
    try {
      const method = savedIds.has(offerId) ? 'DELETE' : 'POST';
      await request(`/api/auth/saved-offers/${offerId}`, { method, headers: bearer(auth.token) });
      await loadSaved();
    } catch { /* ignore; list refresh shows the true state */ }
  }

  return (
    <div className="page">
      <div className="hero">
        <div className="hero-inner">
          <span className="eyebrow">Local Deals, Closer To You</span>
          <h1>Find something good nearby.</h1>
          <p className="hero-subtitle">Discover active offers from verified stores around you. Sign in to save your favourites.</p>
        </div>
      </div>

      <DiscoverySearch onResults={(found, mode) => { setOffers(found); setResultMode(mode); }} loading={loading} setLoading={setLoading} />

      {isCustomer && <SavedOffersPanel savedRefs={savedRefs} onToggleSave={toggleSave} onOpen={setOpenOfferId} />}

      {!auth.token && (
        <AuthForm
          idPrefix="c"
          expectedRole="CUSTOMER"
          registerPath="/api/auth/register"
          onAuth={onAuth}
          copy={{
            loginTitle: 'Welcome back', registerTitle: 'Create your account',
            loginSubtitle: 'Sign in to save offers and manage your favourites.',
            registerSubtitle: 'Join DealNear to discover and save local deals.',
            registerPrompt: "Don't have an account?",
            wrongRole: 'This is not a customer account. Use the matching portal tab to sign in.',
          }}
        />
      )}

      {offers.length > 0 && (
        <section aria-live="polite">
          <div className="section-header">
            <span className="section-title">Results <span className="badge badge-draft">{offers.length}</span></span>
            <span className="section-meta">{resultMode === 'nearby' ? 'Sorted by distance' : 'Newest first'}</span>
          </div>
          <div className="offer-grid">
            {offers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} saved={savedIds.has(offer.id)} canSave={isCustomer}
                onToggleSave={toggleSave} onOpen={setOpenOfferId} />
            ))}
          </div>
        </section>
      )}

      {openOfferId && (
        <Modal title="Offer details" onClose={() => setOpenOfferId(null)}>
          <OfferDetail offerId={openOfferId} auth={auth} saved={savedIds.has(openOfferId)}
            onToggleSave={toggleSave} onOpen={setOpenOfferId} />
        </Modal>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   VENDOR PORTAL
═══════════════════════════════════════════════════════════ */

function StoreForm({ initial, onSave, onCancel, loading }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [lat, setLat] = useState(String(initial?.latitude ?? ''));
  const [lng, setLng] = useState(String(initial?.longitude ?? ''));

  function submit(e) {
    e.preventDefault();
    onSave({ name, address, city, latitude: parseFloat(lat), longitude: parseFloat(lng) });
  }

  return (
    <form className="form-grid" onSubmit={submit} id="store-form">
      {initial?.verificationStatus === 'REJECTED' && (
        <Notice type="info">Saving changes resubmits this store for admin review.</Notice>
      )}
      <div className="field">
        <label htmlFor="s-name">Store name</label>
        <input id="s-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Fresh Mart" />
      </div>
      <div className="field">
        <label htmlFor="s-address">Street address</label>
        <input id="s-address" value={address} onChange={(e) => setAddress(e.target.value)} required placeholder="123 Main St" />
      </div>
      <div className="field">
        <label htmlFor="s-city">City</label>
        <input id="s-city" value={city} onChange={(e) => setCity(e.target.value)} required placeholder="New York" />
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="s-lat">Latitude</label>
          <input id="s-lat" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} required placeholder="40.7128" />
        </div>
        <div className="field">
          <label htmlFor="s-lng">Longitude</label>
          <input id="s-lng" inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} required placeholder="-74.0060" />
        </div>
      </div>
      <div className="form-actions">
        {onCancel && <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="btn btn-primary" disabled={loading} id="save-store-btn">
          {loading ? <Spinner /> : null} {initial ? 'Update store' : 'Submit store for review'}
        </button>
      </div>
    </form>
  );
}

function toLocalInput(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function OfferForm({ initial, stores, onSave, onCancel, loading }) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [desc, setDesc] = useState(initial?.description ?? '');
  const [category, setCategory] = useState(initial?.category ?? 'OTHER');
  const [sid, setSid] = useState(initial?.storeId ?? '');
  const [startAt, setStartAt] = useState(toLocalInput(initial?.startAt));
  const [endAt, setEndAt] = useState(toLocalInput(initial?.endAt));

  function submit(e) {
    e.preventDefault();
    if (initial) {
      // The validity window is fixed after creation; offer-service only edits content.
      onSave({ title, description: desc, category });
    } else {
      onSave({ storeId: sid, title, description: desc, category,
        startAt: new Date(startAt).toISOString(), endAt: new Date(endAt).toISOString() });
    }
  }

  return (
    <form className="form-grid" onSubmit={submit} id="offer-form">
      {!initial && (
        <div className="field">
          <label htmlFor="of-store">Store</label>
          <select id="of-store" value={sid} onChange={(e) => setSid(e.target.value)} required>
            <option value="">Select a store…</option>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name} – {s.city}{s.verificationStatus !== 'VERIFIED' ? ' (awaiting verification)' : ''}</option>)}
          </select>
        </div>
      )}
      <div className="field">
        <label htmlFor="of-title">Offer title</label>
        <input id="of-title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength="255" placeholder="e.g. 20% off all produce" />
      </div>
      <div className="field">
        <label htmlFor="of-desc">Description</label>
        <textarea id="of-desc" value={desc} onChange={(e) => setDesc(e.target.value)} required maxLength="2000" placeholder="Describe your offer…" />
      </div>
      <div className="field">
        <label htmlFor="of-category">Category</label>
        <CategorySelect id="of-category" value={category} onChange={setCategory} required />
      </div>
      {!initial && (
        <div className="form-row">
          <div className="field">
            <label htmlFor="of-start">Start date &amp; time</label>
            <input id="of-start" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="of-end">End date &amp; time</label>
            <input id="of-end" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
          </div>
        </div>
      )}
      <div className="form-actions">
        {onCancel && <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="btn btn-primary" disabled={loading} id="save-offer-btn">
          {loading ? <Spinner /> : null} {initial ? 'Update offer' : 'Create draft'}
        </button>
      </div>
    </form>
  );
}

function StoresTab({ token }) {
  const headers = useMemo(() => bearer(token), [token]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [modal, setModal] = useState(null); // null | 'create' | store-object

  useEffect(() => {
    setLoading(true);
    request('/api/vendors/stores?size=50', { headers })
      .then((result) => setStores(result.stores ?? []))
      .catch((err) => setNotice({ type: 'error', text: err.message }))
      .finally(() => setLoading(false));
  }, [headers]);

  async function saveStore(data) {
    setSaving(true); setNotice(null);
    try {
      if (modal === 'create') {
        const created = await request('/api/vendors/stores', { method: 'POST', body: JSON.stringify(data), headers });
        setStores((s) => [created, ...s]);
        setNotice({ type: 'success', text: `Store "${created.name}" submitted. An admin will verify it before its offers can go live.` });
      } else {
        const updated = await request(`/api/vendors/stores/${modal.id}`, { method: 'PATCH', body: JSON.stringify(data), headers });
        setStores((s) => s.map((st) => (st.id === updated.id ? updated : st)));
        setNotice({ type: 'success', text: `Store "${updated.name}" updated.` });
      }
      setModal(null);
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally { setSaving(false); }
  }

  return (
    <div>
      {notice && <Notice type={notice.type}>{notice.text}</Notice>}
      <div className="section-header">
        <span className="section-title">My Stores</span>
        <button className="btn btn-primary btn-sm" onClick={() => setModal('create')} id="create-store-btn">+ New Store</button>
      </div>

      {loading && <div className="center-pad"><Spinner /></div>}
      {!loading && stores.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">🏪</span>
          <p>You haven't created any stores yet. Create your first store to start publishing offers.</p>
        </div>
      )}
      {!loading && stores.length > 0 && (
        <div className="list-items">
          {stores.map((store) => (
            <div className="list-item" key={store.id} id={`store-item-${store.id}`}>
              <div className="list-item-body">
                <div className="list-item-heading">
                  <div className="list-item-title">{store.name}</div>
                  <StatusBadge status={store.verificationStatus} />
                </div>
                <div className="list-item-meta">{store.address}, {store.city} · {store.latitude.toFixed(4)}, {store.longitude.toFixed(4)}</div>
                {store.verificationStatus === 'REJECTED' && store.verificationNote && (
                  <div className="moderation-note">Admin note: {store.verificationNote}</div>
                )}
              </div>
              <div className="list-item-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => setModal(store)} id={`edit-store-${store.id}`}>Edit</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={modal === 'create' ? 'Create a new store' : `Edit: ${modal.name}`} onClose={() => setModal(null)}>
          <StoreForm initial={modal === 'create' ? null : modal} onSave={saveStore} onCancel={() => setModal(null)} loading={saving} />
        </Modal>
      )}
    </div>
  );
}

const ACTION_LABELS = {
  publish: ['Publish', 'btn-success', 'published'],
  pause: ['Pause', 'btn-secondary', 'paused'],
  resume: ['Resume', 'btn-success', 'resumed'],
  unpublish: ['Back to draft', 'btn-secondary', 'moved back to draft'],
  expire: ['End now', 'btn-secondary', 'ended'],
};

function OffersTab({ token }) {
  const headers = useMemo(() => bearer(token), [token]);
  const [offers, setOffers] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [modal, setModal] = useState(null); // null | 'create' | offer-object

  useEffect(() => {
    setLoading(true);
    Promise.all([request('/api/offers?size=50', { headers }), request('/api/vendors/stores?size=50', { headers })])
      .then(([offersRes, storesRes]) => { setOffers(offersRes.offers ?? []); setStores(storesRes.stores ?? []); })
      .catch((err) => setNotice({ type: 'error', text: err.message }))
      .finally(() => setLoading(false));
  }, [headers]);

  function replace(updated) {
    setOffers((o) => o.map((of) => (of.id === updated.id ? updated : of)));
  }

  async function saveOffer(data) {
    setSaving(true); setNotice(null);
    try {
      if (modal === 'create') {
        const created = await request('/api/offers', { method: 'POST', body: JSON.stringify(data), headers });
        setOffers((o) => [created, ...o]);
        setNotice({ type: 'success', text: `Offer "${created.title}" created as draft.` });
      } else {
        replace(await request(`/api/offers/${modal.id}`, { method: 'PATCH', body: JSON.stringify(data), headers }));
        setNotice({ type: 'success', text: 'Offer updated.' });
      }
      setModal(null);
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally { setSaving(false); }
  }

  async function runAction(offer, action) {
    setNotice(null);
    try {
      if (action === 'delete') {
        if (!confirm(`Delete offer "${offer.title}"? This cannot be undone.`)) return;
        await request(`/api/offers/${offer.id}`, { method: 'DELETE', headers });
        setOffers((o) => o.filter((of) => of.id !== offer.id));
        setNotice({ type: 'success', text: 'Offer deleted.' });
        return;
      }
      if (action === 'expire' && !confirm(`End "${offer.title}" now? Ended offers cannot be republished.`)) return;
      replace(await request(`/api/offers/${offer.id}/${action}`, { method: 'POST', headers }));
      setNotice({ type: 'success', text: `Offer ${ACTION_LABELS[action][2]}.` });
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    }
  }

  const storeById = useMemo(() => Object.fromEntries(stores.map((s) => [s.id, s])), [stores]);

  return (
    <div>
      {notice && <Notice type={notice.type}>{notice.text}</Notice>}
      <div className="section-header">
        <span className="section-title">My Offers</span>
        <button className="btn btn-primary btn-sm" id="create-offer-btn"
          onClick={() => { if (stores.length === 0) { setNotice({ type: 'error', text: 'Create a store first before adding offers.' }); return; } setModal('create'); }}>
          + New Offer
        </button>
      </div>

      {loading && <div className="center-pad"><Spinner /></div>}
      {!loading && offers.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">🏷️</span>
          <p>No offers yet. Create your first deal to start attracting customers.</p>
        </div>
      )}
      {!loading && offers.length > 0 && (
        <div className="list-items">
          {offers.map((offer) => {
            const store = storeById[offer.storeId];
            const actions = vendorActions(offer);
            const awaitingVerification = store && store.verificationStatus !== 'VERIFIED' && offer.status === 'DRAFT';
            return (
              <div className="list-item" key={offer.id} id={`offer-item-${offer.id}`}>
                <div className="list-item-body">
                  <div className="list-item-heading">
                    <div className="list-item-title">{offer.title}</div>
                    <StatusBadge status={displayStatus(offer)} />
                  </div>
                  <div className="list-item-meta">
                    {store ? `${store.name} · ${store.city}` : offer.storeId} · {categoryLabel(offer.category)} · {formatDate(offer.startAt)} – {formatDate(offer.endAt)}
                  </div>
                  {offer.status === 'REMOVED' && offer.moderationNote && (
                    <div className="moderation-note">Removed by an admin: {offer.moderationNote}</div>
                  )}
                  {awaitingVerification && <div className="moderation-note">Can be published once the store is verified.</div>}
                </div>
                <div className="list-item-actions">
                  {actions.includes('edit') && (
                    <button className="btn btn-secondary btn-sm" onClick={() => setModal(offer)} id={`edit-offer-${offer.id}`}>Edit</button>
                  )}
                  {actions.filter((a) => ACTION_LABELS[a]).map((a) => (
                    <button key={a} className={`btn btn-sm ${ACTION_LABELS[a][1]}`} onClick={() => runAction(offer, a)} id={`${a}-offer-${offer.id}`}>
                      {ACTION_LABELS[a][0]}
                    </button>
                  ))}
                  <button className="btn btn-danger btn-sm" onClick={() => runAction(offer, 'delete')} id={`delete-offer-${offer.id}`}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal title={modal === 'create' ? 'Create a new offer' : `Edit: ${modal.title}`} onClose={() => setModal(null)}>
          <OfferForm initial={modal === 'create' ? null : modal} stores={stores} onSave={saveOffer} onCancel={() => setModal(null)} loading={saving} />
        </Modal>
      )}
    </div>
  );
}

function VendorPortal({ auth, onAuth, onSignOut }) {
  const [tab, setTab] = useState('stores');

  if (auth.role !== 'VENDOR') {
    return (
      <div className="page">
        <div className="hero">
          <div className="hero-inner">
            <span className="eyebrow">Vendor Portal</span>
            <h1>Manage your stores & offers.</h1>
            <p className="hero-subtitle">Create and publish local deals to bring customers through your door.</p>
          </div>
        </div>
        {auth.token ? (
          <Notice type="info">You are signed in with a non-vendor account. Sign out to use the vendor portal.</Notice>
        ) : (
          <AuthForm
            idPrefix="v"
            expectedRole="VENDOR"
            registerPath="/api/auth/register/vendor"
            onAuth={onAuth}
            copy={{
              loginTitle: 'Vendor sign in', registerTitle: 'Create vendor account',
              loginSubtitle: 'Sign in to manage your stores and offers.',
              registerSubtitle: 'Register as a vendor to create and publish local deals.',
              registerPrompt: 'New vendor?',
              wrongRole: 'This is not a vendor account. Use the matching portal tab to sign in.',
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <div className="vendor-welcome">
        <div className="vendor-avatar">🏪</div>
        <div>
          <div style={{ fontWeight: '800', fontSize: '1rem' }}>Vendor Dashboard</div>
          <div className="muted-copy">New stores are reviewed by an admin before their offers can go live.</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn-secondary btn-sm" onClick={onSignOut}>Sign out</button>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'stores' ? 'active' : ''}`} onClick={() => setTab('stores')} id="tab-stores">🏪 Stores</button>
        <button className={`tab ${tab === 'offers' ? 'active' : ''}`} onClick={() => setTab('offers')} id="tab-offers">🏷️ Offers</button>
      </div>

      {tab === 'stores' && <StoresTab token={auth.token} />}
      {tab === 'offers' && <OffersTab token={auth.token} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ROOT APP
═══════════════════════════════════════════════════════════ */
const ROLE_PORTAL = { CUSTOMER: 'customer', VENDOR: 'vendor', ADMIN: 'admin' };
const ROLE_LABEL = { CUSTOMER: '👤 Customer', VENDOR: '🏪 Vendor', ADMIN: '🛡️ Admin' };

function App() {
  const [auth, setAuth] = useState(() => loadAuth());
  const [portal, setPortal] = useState(() => ROLE_PORTAL[auth.role] ?? 'customer');
  const [sessionNotice, setSessionNotice] = useState(null);

  const signOut = useCallback(() => {
    clearToken();
    setAuth(SIGNED_OUT);
  }, []);

  const handleAuth = useCallback((token) => {
    saveToken(token);
    const next = authFromToken(token);
    setAuth(next);
    setSessionNotice(null);
    if (ROLE_PORTAL[next.role]) setPortal(ROLE_PORTAL[next.role]);
  }, []);

  useEffect(() => {
    function expired() {
      signOut();
      setSessionNotice('Your session has expired. Please sign in again.');
    }
    function syncFromOtherTab(event) {
      if (event.key === null || event.key === 'dealnear.token') setAuth(loadAuth());
    }
    window.addEventListener(UNAUTHORIZED_EVENT, expired);
    window.addEventListener('storage', syncFromOtherTab);
    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, expired);
      window.removeEventListener('storage', syncFromOtherTab);
    };
  }, [signOut]);

  // Signs the user out when the token's expiry passes while the page stays open.
  const expiryTimer = useRef(null);
  useEffect(() => {
    clearTimeout(expiryTimer.current);
    if (!auth.token) return undefined;
    const exp = parseToken(auth.token)?.exp ?? 0;
    const delay = Math.min(exp * 1000 - Date.now(), 2 ** 31 - 1);
    expiryTimer.current = setTimeout(() => window.dispatchEvent(new Event(UNAUTHORIZED_EVENT)), Math.max(delay, 0));
    return () => clearTimeout(expiryTimer.current);
  }, [auth.token]);

  const tabs = [['customer', '🛍️ Customer'], ['vendor', '🏪 Vendor'], ['admin', '🛡️ Admin']];

  return (
    <div className="app-shell">
      <nav className="navbar" role="navigation" aria-label="Main navigation">
        <div className="navbar-brand">DealNear<span>beta</span></div>
        <div className="navbar-actions">
          {auth.role && <span className={`navbar-pill ${auth.role === 'VENDOR' ? 'vendor' : ''}`}>{ROLE_LABEL[auth.role] ?? auth.role}</span>}
          {auth.token && <button className="btn btn-secondary btn-sm" onClick={signOut} id="signout-btn">Sign out</button>}
        </div>
      </nav>

      <div className="portal-switcher" role="tablist" aria-label="Select portal">
        {tabs.map(([key, label]) => (
          <button key={key} className={`portal-tab ${portal === key ? 'active' : ''}`} onClick={() => setPortal(key)}
            role="tab" aria-selected={portal === key} id={`portal-tab-${key}`}>
            {label}
          </button>
        ))}
      </div>

      {sessionNotice && <div className="page" style={{ paddingBottom: 0 }}><Notice type="info">{sessionNotice}</Notice></div>}

      {portal === 'customer' && <CustomerPortal auth={auth} onAuth={handleAuth} />}
      {portal === 'vendor' && <VendorPortal auth={auth} onAuth={handleAuth} onSignOut={signOut} />}
      {portal === 'admin' && <AdminPortal auth={auth} onAuth={handleAuth} />}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
