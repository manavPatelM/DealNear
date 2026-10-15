import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

/* ─── API client ─────────────────────────────────────────── */
const API = import.meta.env.VITE_API_URL ?? '';

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  if (response.status === 204) return null;
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      // Non-JSON response body
    }
  }
  if (!response.ok) {
    const fallback =
      response.status === 401
        ? 'Invalid credentials or unauthorized'
        : response.status === 403
        ? 'Access forbidden'
        : response.status === 404
        ? 'Resource not found'
        : response.status === 409
        ? 'Resource already exists'
        : response.status >= 500
        ? 'Service temporarily unavailable'
        : `Request failed (${response.status})`;
    throw new Error(body?.error?.message ?? body?.message ?? fallback);
  }
  return body;
}

/* ─── Auth helpers ───────────────────────────────────────── */
function parseToken(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload;
  } catch {
    return null;
  }
}

function loadAuth() {
  const token = localStorage.getItem('dealnear.token');
  const payload = parseToken(token);
  if (!payload) return { token: null, role: null, email: null };
  return { token, role: payload.role, email: null };
}

/* ─── Spinner ────────────────────────────────────────────── */
function Spinner() { return <div className="spinner" aria-hidden="true" />; }

/* ─── Notice ─────────────────────────────────────────────── */
function Notice({ type = 'info', children }) {
  return <p className={`notice notice-${type}`} role="status">{children}</p>;
}

/* ─── Badge ──────────────────────────────────────────────── */
const statusClass = { DRAFT: 'badge-draft', PUBLISHED: 'badge-published', PAUSED: 'badge-paused' };
function StatusBadge({ status }) {
  const label = status === 'PUBLISHED' ? '● Published' : status === 'PAUSED' ? '⏸ Paused' : '✎ Draft';
  return <span className={`badge ${statusClass[status] ?? 'badge-draft'}`}>{label}</span>;
}

/* ─── Modal ──────────────────────────────────────────────── */
function Modal({ title, onClose, children }) {
  const ref = useRef();
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      id="modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal" ref={ref} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <h2 className="modal-title" id="modal-title">{title}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CUSTOMER PORTAL
═══════════════════════════════════════════════════════════ */

function CustomerAuth({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setNotice(null);
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const result = await request(path, { method: 'POST', body: JSON.stringify({ email, password }) });
      localStorage.setItem('dealnear.token', result.accessToken);
      onAuth(result);
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card card-padded auth-card">
      <h2 style={{ marginBottom: '4px' }}>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '.85rem', marginBottom: '24px' }}>
        {mode === 'login' ? 'Sign in to save offers and manage your favourites.' : 'Join DealNear to discover and save local deals.'}
      </p>
      {notice && <Notice type={notice.type}>{notice.text}</Notice>}
      <form className="form-grid" onSubmit={submit}>
        <div className="field">
          <label htmlFor="c-email">Email address</label>
          <input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
        </div>
        <div className="field">
          <label htmlFor="c-pass">Password</label>
          <input id="c-pass" type="password" minLength="8" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Min. 8 characters" />
        </div>
        <button className="btn btn-primary btn-block btn-lg" disabled={loading} type="submit">
          {loading ? <Spinner /> : null}
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>
      <div className="auth-toggle">
        {mode === 'login' ? (
          <>Don't have an account? <button className="btn-ghost btn" style={{ display: 'inline', padding: '0 4px' }} onClick={() => setMode('register')}>Register</button></>
        ) : (
          <>Already have an account? <button className="btn-ghost btn" style={{ display: 'inline', padding: '0 4px' }} onClick={() => setMode('login')}>Sign in</button></>
        )}
      </div>
    </div>
  );
}

function DiscoverySearch({ onResults, loading, setLoading }) {
  const [lat, setLat] = useState('40.7128');
  const [lng, setLng] = useState('-74.0060');
  const [radius, setRadius] = useState('10');
  const [notice, setNotice] = useState(null);

  function useMyLocation() {
    if (!navigator.geolocation) { setNotice({ type: 'error', text: 'Geolocation not supported.' }); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(String(pos.coords.latitude.toFixed(6))); setLng(String(pos.coords.longitude.toFixed(6))); setNotice(null); },
      () => setNotice({ type: 'error', text: 'Could not get location. Enter coordinates manually.' })
    );
  }

  async function search(e) {
    e.preventDefault();
    setLoading(true); setNotice(null);
    try {
      const params = new URLSearchParams({ latitude: lat, longitude: lng, radiusKm: radius });
      const result = await request(`/api/discovery/offers?${params}`);
      onResults(result.offers ?? []);
      if ((result.offers ?? []).length === 0) setNotice({ type: 'info', text: 'No active offers found in this area. Try a larger radius.' });
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
          <div className="card-title">Find offers near you</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={useMyLocation} type="button" id="use-location-btn">
          📍 Use my location
        </button>
      </div>
      {notice && <Notice type={notice.type}>{notice.text}</Notice>}
      <form className="discovery-search" onSubmit={search}>
        <div className="field">
          <label htmlFor="disc-lat">Latitude</label>
          <input id="disc-lat" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} required placeholder="40.7128" />
        </div>
        <div className="field">
          <label htmlFor="disc-lng">Longitude</label>
          <input id="disc-lng" inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} required placeholder="-74.0060" />
        </div>
        <div className="field">
          <label htmlFor="disc-radius">Radius (km, max 50)</label>
          <input id="disc-radius" type="number" min="0.1" max="50" step="0.1" value={radius} onChange={(e) => setRadius(e.target.value)} required />
        </div>
        <button className="btn btn-primary" disabled={loading} type="submit" id="search-offers-btn">
          {loading ? <Spinner /> : '🔍'} Search
        </button>
      </form>
    </div>
  );
}

function OfferCard({ offer, saved, onToggleSave }) {
  const start = offer.startAt ? new Date(offer.startAt).toLocaleDateString() : null;
  const end = offer.endAt ? new Date(offer.endAt).toLocaleDateString() : null;
  return (
    <article className="offer-card">
      <div className="offer-card-meta">
        <span className="distance-tag">{offer.distanceKm?.toFixed(1)} km away</span>
        <button
          className={`save-btn ${saved ? 'saved' : ''}`}
          onClick={() => onToggleSave(offer.id)}
          aria-label={saved ? 'Unsave offer' : 'Save offer'}
          id={`save-btn-${offer.id}`}
        >
          {saved ? '♥' : '♡'}
        </button>
      </div>
      <p className="offer-store">{offer.storeName} · {offer.storeCity}</p>
      <h3 className="offer-title">{offer.title}</h3>
      <p className="offer-desc">{offer.description}</p>
      {start && end && (
        <p className="offer-validity">Valid {start} – {end}</p>
      )}
    </article>
  );
}

function SavedOffersPanel({ token, savedIds, setSavedIds, savedOffers, setSavedOffers, onToggleSave }) {
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const result = await request('/api/auth/saved-offers', { headers: { Authorization: `Bearer ${token}` } });
      setSavedOffers(result.savedOffers ?? []);
      setSavedIds(new Set((result.savedOffers ?? []).map((s) => s.offerId)));
    } catch { /* keep stale */ }
    finally { setLoading(false); }
  }

  return (
    <div className="card card-padded" style={{ marginBottom: '32px' }}>
      <div className="card-header">
        <div>
          <span className="eyebrow">Your List</span>
          <div className="card-title">
            Saved offers <span className="badge badge-draft" style={{ marginLeft: 6 }}>{savedOffers.length}</span>
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={refresh} disabled={loading} id="refresh-saved-btn">
          {loading ? <Spinner /> : '↺'} Refresh
        </button>
      </div>
      {savedOffers.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>
          You haven't saved any offers yet. Tap ♡ on an offer to keep it here.
        </p>
      ) : (
        <ul className="saved-list">
          {savedOffers.map((saved) => (
            <li key={saved.id} className="saved-item">
              <span>Offer <code>{saved.offerId}</code></span>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => onToggleSave(saved.offerId)}
                id={`remove-saved-${saved.offerId}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CustomerPortal({ auth, onSignOut }) {
  const [offers, setOffers] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [savedOffers, setSavedOffers] = useState([]);
  const [loading, setLoading] = useState(false);

  const authHeaders = useMemo(() => (auth.token ? { Authorization: `Bearer ${auth.token}` } : {}), [auth.token]);

  useEffect(() => {
    if (auth.token) loadSavedOffers();
  }, [auth.token]);

  async function loadSavedOffers() {
    try {
      const result = await request('/api/auth/saved-offers', { headers: authHeaders });
      const items = result.savedOffers ?? [];
      setSavedOffers(items);
      setSavedIds(new Set(items.map((s) => s.offerId)));
    } catch { /* ignore */ }
  }

  async function toggleSave(offerId) {
    if (!auth.token) return;
    try {
      if (savedIds.has(offerId)) {
        await request(`/api/auth/saved-offers/${offerId}`, { method: 'DELETE', headers: authHeaders });
        setSavedIds((cur) => { const s = new Set(cur); s.delete(offerId); return s; });
        setSavedOffers((cur) => cur.filter((s) => s.offerId !== offerId));
      } else {
        await request(`/api/auth/saved-offers/${offerId}`, { method: 'POST', headers: authHeaders });
        setSavedIds((cur) => new Set(cur).add(offerId));
        await loadSavedOffers();
      }
    } catch { /* ignore */ }
  }

  return (
    <div className="page">
      <div className="hero">
        <div className="hero-inner">
          <span className="eyebrow">Local Deals, Closer To You</span>
          <h1>Find something good nearby.</h1>
          <p className="hero-subtitle">Discover active offers from stores around your location. Sign in to save your favourites.</p>
        </div>
      </div>

      <DiscoverySearch onResults={setOffers} loading={loading} setLoading={setLoading} />

      {auth.token && (
        <SavedOffersPanel
          token={auth.token}
          savedIds={savedIds} setSavedIds={setSavedIds}
          savedOffers={savedOffers} setSavedOffers={setSavedOffers}
          onToggleSave={toggleSave}
        />
      )}

      {!auth.token && (
        <CustomerAuth onAuth={(result) => {
          const payload = parseToken(result.accessToken);
          // reload saved offers is handled by useEffect on auth.token change
        }} />
      )}

      {offers.length > 0 && (
        <section aria-live="polite">
          <div className="section-header">
            <span className="section-title">Results <span className="badge badge-draft">{offers.length}</span></span>
            <span className="section-meta">Sorted by distance</span>
          </div>
          <div className="offer-grid">
            {offers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                saved={savedIds.has(offer.id)}
                onToggleSave={toggleSave}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   VENDOR PORTAL
═══════════════════════════════════════════════════════════ */

function VendorAuth({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setNotice(null);
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register/vendor';
      const result = await request(path, { method: 'POST', body: JSON.stringify({ email, password }) });
      if (result.role !== 'VENDOR') {
        setNotice({ type: 'error', text: 'This account is not a vendor account. Please sign in on the Customer tab.' });
        return;
      }
      localStorage.setItem('dealnear.token', result.accessToken);
      onAuth(result);
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card card-padded auth-card">
      <h2 style={{ marginBottom: '4px' }}>{mode === 'login' ? 'Vendor sign in' : 'Create vendor account'}</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '.85rem', marginBottom: '24px' }}>
        {mode === 'login' ? 'Sign in to manage your stores and offers.' : 'Register as a vendor to create and publish local deals.'}
      </p>
      {notice && <Notice type={notice.type}>{notice.text}</Notice>}
      <form className="form-grid" onSubmit={submit}>
        <div className="field">
          <label htmlFor="v-email">Email address</label>
          <input id="v-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="vendor@example.com" />
        </div>
        <div className="field">
          <label htmlFor="v-pass">Password</label>
          <input id="v-pass" type="password" minLength="8" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Min. 8 characters" />
        </div>
        <button className="btn btn-primary btn-block btn-lg" disabled={loading} type="submit">
          {loading ? <Spinner /> : null}
          {mode === 'login' ? 'Sign in' : 'Create vendor account'}
        </button>
      </form>
      <div className="auth-toggle">
        {mode === 'login' ? (
          <>New vendor? <button className="btn-ghost btn" style={{ display: 'inline', padding: '0 4px' }} onClick={() => setMode('register')}>Create an account</button></>
        ) : (
          <>Already have an account? <button className="btn-ghost btn" style={{ display: 'inline', padding: '0 4px' }} onClick={() => setMode('login')}>Sign in</button></>
        )}
      </div>
    </div>
  );
}

/* ── Store Form ──────────────────────────────────────────── */
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
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
        {onCancel && <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="btn btn-primary" disabled={loading} id="save-store-btn">
          {loading ? <Spinner /> : null} {initial ? 'Update store' : 'Create store'}
        </button>
      </div>
    </form>
  );
}

/* ── Offer Form ──────────────────────────────────────────── */
function OfferForm({ initial, storeId, stores, onSave, onCancel, loading }) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [desc, setDesc] = useState(initial?.description ?? '');
  const [sid, setSid] = useState(storeId ?? initial?.storeId ?? '');
  const [startAt, setStartAt] = useState(initial?.startAt ? initial.startAt.slice(0, 16) : '');
  const [endAt, setEndAt] = useState(initial?.endAt ? initial.endAt.slice(0, 16) : '');

  function submit(e) {
    e.preventDefault();
    const payload = { title, description: desc, startAt: new Date(startAt).toISOString(), endAt: new Date(endAt).toISOString() };
    if (!initial) payload.storeId = sid;
    onSave(payload);
  }

  return (
    <form className="form-grid" onSubmit={submit} id="offer-form">
      {!initial && stores && stores.length > 0 && (
        <div className="field">
          <label htmlFor="of-store">Store</label>
          <select id="of-store" value={sid} onChange={(e) => setSid(e.target.value)} required>
            <option value="">Select a store…</option>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name} – {s.city}</option>)}
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
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
        {onCancel && <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="btn btn-primary" disabled={loading} id="save-offer-btn">
          {loading ? <Spinner /> : null} {initial ? 'Update offer' : 'Create offer'}
        </button>
      </div>
    </form>
  );
}

/* ── Stores tab ──────────────────────────────────────────── */
function StoresTab({ token }) {
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [modal, setModal] = useState(null); // null | 'create' | store-object

  useEffect(() => { fetchStores(); }, [token]);

  async function fetchStores() {
    setLoading(true);
    try {
      const result = await request('/api/vendors/stores', { headers });
      setStores(result.stores ?? []);
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally { setLoading(false); }
  }

  async function saveStore(data) {
    setSaving(true); setNotice(null);
    try {
      if (modal === 'create') {
        const created = await request('/api/vendors/stores', { method: 'POST', body: JSON.stringify(data), headers });
        setStores((s) => [created, ...s]);
        setNotice({ type: 'success', text: `Store "${created.name}" created.` });
      } else {
        const updated = await request(`/api/vendors/stores/${modal.id}`, { method: 'PATCH', body: JSON.stringify(data), headers });
        setStores((s) => s.map((st) => st.id === updated.id ? updated : st));
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

      {loading && <div style={{ textAlign: 'center', padding: '32px' }}><Spinner /></div>}
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
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>🏪</div>
              <div className="list-item-body">
                <div className="list-item-title">{store.name}</div>
                <div className="list-item-meta">{store.address}, {store.city} · {store.latitude.toFixed(4)}, {store.longitude.toFixed(4)}</div>
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

/* ── Offers tab ──────────────────────────────────────────── */
function OffersTab({ token }) {
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const [offers, setOffers] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [modal, setModal] = useState(null); // null | 'create' | offer-object

  useEffect(() => { fetchAll(); }, [token]);

  async function fetchAll() {
    setLoading(true);
    try {
      const [offersRes, storesRes] = await Promise.all([
        request('/api/offers', { headers }),
        request('/api/vendors/stores', { headers }),
      ]);
      setOffers(offersRes.offers ?? []);
      setStores(storesRes.stores ?? []);
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally { setLoading(false); }
  }

  async function saveOffer(data) {
    setSaving(true); setNotice(null);
    try {
      if (modal === 'create') {
        const created = await request('/api/offers', { method: 'POST', body: JSON.stringify(data), headers });
        setOffers((o) => [created, ...o]);
        setNotice({ type: 'success', text: `Offer "${created.title}" created as draft.` });
      } else {
        const updated = await request(`/api/offers/${modal.id}`, { method: 'PATCH', body: JSON.stringify({ title: data.title, description: data.description }), headers });
        setOffers((o) => o.map((of) => of.id === updated.id ? updated : of));
        setNotice({ type: 'success', text: `Offer "${updated.title}" updated.` });
      }
      setModal(null);
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally { setSaving(false); }
  }

  async function changeStatus(offer, action) {
    try {
      let updated;
      if (action === 'publish') {
        updated = await request(`/api/offers/${offer.id}/publish`, { method: 'POST', headers });
      } else if (action === 'unpublish') {
        updated = await request(`/api/offers/${offer.id}/unpublish`, { method: 'POST', headers });
      } else if (action === 'delete') {
        if (!confirm(`Delete offer "${offer.title}"? This cannot be undone.`)) return;
        await request(`/api/offers/${offer.id}`, { method: 'DELETE', headers });
        setOffers((o) => o.filter((of) => of.id !== offer.id));
        setNotice({ type: 'success', text: 'Offer deleted.' });
        return;
      }
      setOffers((o) => o.map((of) => of.id === updated.id ? updated : of));
      setNotice({ type: 'success', text: `Offer ${action === 'publish' ? 'published' : 'unpublished'}.` });
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    }
  }

  function storeName(storeId) {
    const s = stores.find((st) => st.id === storeId);
    return s ? `${s.name} · ${s.city}` : storeId;
  }

  return (
    <div>
      {notice && <Notice type={notice.type}>{notice.text}</Notice>}
      <div className="section-header">
        <span className="section-title">My Offers</span>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => { if (stores.length === 0) { setNotice({ type: 'error', text: 'Create a store first before adding offers.' }); return; } setModal('create'); }}
          id="create-offer-btn"
        >
          + New Offer
        </button>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '32px' }}><Spinner /></div>}
      {!loading && offers.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">🏷️</span>
          <p>No offers yet. Create your first deal to start attracting customers.</p>
        </div>
      )}
      {!loading && offers.length > 0 && (
        <div className="list-items">
          {offers.map((offer) => (
            <div className="list-item" key={offer.id} id={`offer-item-${offer.id}`}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <div className="list-item-title" style={{ flex: 1, minWidth: 0 }}>{offer.title}</div>
                  <StatusBadge status={offer.status} />
                </div>
                <div className="list-item-meta">
                  {storeName(offer.storeId)} · {offer.startAt ? new Date(offer.startAt).toLocaleDateString() : '?'} – {offer.endAt ? new Date(offer.endAt).toLocaleDateString() : '?'}
                </div>
                {offer.description && (
                  <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {offer.description}
                  </div>
                )}
              </div>
              <div className="list-item-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => setModal(offer)} id={`edit-offer-${offer.id}`}>Edit</button>
                {offer.status === 'DRAFT' && (
                  <button className="btn btn-success btn-sm" onClick={() => changeStatus(offer, 'publish')} id={`publish-offer-${offer.id}`}>Publish</button>
                )}
                {offer.status === 'PUBLISHED' && (
                  <button className="btn btn-secondary btn-sm" onClick={() => changeStatus(offer, 'unpublish')} id={`unpublish-offer-${offer.id}`}>Unpublish</button>
                )}
                <button className="btn btn-danger btn-sm" onClick={() => changeStatus(offer, 'delete')} id={`delete-offer-${offer.id}`}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal
          title={modal === 'create' ? 'Create a new offer' : `Edit: ${modal.title}`}
          onClose={() => setModal(null)}
        >
          <OfferForm
            initial={modal === 'create' ? null : modal}
            stores={stores}
            onSave={saveOffer}
            onCancel={() => setModal(null)}
            loading={saving}
          />
        </Modal>
      )}
    </div>
  );
}

function VendorPortal({ auth, onSignOut }) {
  const [tab, setTab] = useState('stores');

  if (!auth.token || auth.role !== 'VENDOR') {
    return (
      <div className="page">
        <div className="hero">
          <div className="hero-inner">
            <span className="eyebrow">Vendor Portal</span>
            <h1>Manage your stores & offers.</h1>
            <p className="hero-subtitle">Create and publish local deals to bring customers through your door.</p>
          </div>
        </div>
        <VendorAuth onAuth={(result) => {
          // App-level auth state is controlled by root App
          // We trigger a re-render by dispatching a storage event so the root picks it up.
          window.dispatchEvent(new StorageEvent('storage', { key: 'dealnear.token' }));
        }} />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="vendor-welcome">
        <div className="vendor-avatar">🏪</div>
        <div>
          <div style={{ fontWeight: '800', fontSize: '1rem' }}>Vendor Dashboard</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '.85rem' }}>{auth.email ?? 'Signed in as vendor'}</div>
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
function App() {
  const [portal, setPortal] = useState('customer');
  const [auth, setAuth] = useState(() => loadAuth());

  // Re-sync auth state when storage changes (e.g. vendor login dispatches a storage event)
  useEffect(() => {
    function sync() {
      const next = loadAuth();
      setAuth(next);
    }
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  // Auto-detect best portal based on role
  useEffect(() => {
    if (auth.role === 'VENDOR') setPortal('vendor');
  }, [auth.role]);

  function signOut() {
    localStorage.removeItem('dealnear.token');
    setAuth({ token: null, role: null, email: null });
  }

  function handleCustomerAuth(result) {
    const next = loadAuth();
    setAuth(next);
  }

  return (
    <div className="app-shell">
      {/* Navbar */}
      <nav className="navbar" role="navigation" aria-label="Main navigation">
        <div className="navbar-brand">
          DealNear
          <span>beta</span>
        </div>
        <div className="navbar-actions">
          {auth.role && (
            <span className={`navbar-pill ${auth.role === 'VENDOR' ? 'vendor' : ''}`}>
              {auth.role === 'VENDOR' ? '🏪 Vendor' : '👤 Customer'}
            </span>
          )}
          {auth.token && portal === 'customer' && (
            <button className="btn btn-secondary btn-sm" onClick={signOut} id="signout-btn">Sign out</button>
          )}
        </div>
      </nav>

      {/* Portal Switcher */}
      <div className="portal-switcher" role="tablist" aria-label="Select portal">
        <button
          className={`portal-tab ${portal === 'customer' ? 'active' : ''}`}
          onClick={() => setPortal('customer')}
          role="tab"
          aria-selected={portal === 'customer'}
          id="portal-tab-customer"
        >
          🛍️ Customer
        </button>
        <button
          className={`portal-tab ${portal === 'vendor' ? 'active' : ''}`}
          onClick={() => setPortal('vendor')}
          role="tab"
          aria-selected={portal === 'vendor'}
          id="portal-tab-vendor"
        >
          🏪 Vendor
        </button>
      </div>

      {/* Portal Content */}
      {portal === 'customer' && (
        <CustomerPortal auth={auth} onSignOut={signOut} />
      )}
      {portal === 'vendor' && (
        <VendorPortal auth={auth} onSignOut={signOut} />
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
