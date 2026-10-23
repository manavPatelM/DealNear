import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { request } from '../api.js';
import { useAuth, useCategories, useToast } from '../state.jsx';
import { categoryLabel, displayStatus, formatDate, groupCategories, vendorActions } from '../lib/offers.js';
import { EmptyState, Modal, Notice, PageHeading, Spinner, StatusBadge } from '../ui.jsx';

export function BusinessLayout() {
  return (
    <div className="page">
      <PageHeading eyebrow="My business" title="Business dashboard">
        New stores are reviewed by an admin before their offers can go live.
      </PageHeading>
      <nav className="tabs" aria-label="Business sections">
        <NavLink to="/business/offers" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`} id="tab-offers">🏷️ Offers</NavLink>
        <NavLink to="/business/stores" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`} id="tab-stores">🏪 Stores</NavLink>
      </nav>
      <Outlet />
    </div>
  );
}

function StoreForm({ initial, onSave, onCancel, loading }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [lat, setLat] = useState(String(initial?.latitude ?? ''));
  const [lng, setLng] = useState(String(initial?.longitude ?? ''));
  const [error, setError] = useState(null);

  function submit(e) {
    e.preventDefault();
    const latitude = Number.parseFloat(lat);
    const longitude = Number.parseFloat(lng);
    if (!(latitude >= -90 && latitude <= 90) || !(longitude >= -180 && longitude <= 180)) {
      setError('Latitude must be between -90 and 90, and longitude between -180 and 180.');
      return;
    }
    setError(null);
    onSave({ name: name.trim(), address: address.trim(), city: city.trim(), latitude, longitude });
  }

  function useDevice() {
    navigator.geolocation?.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude.toFixed(6)); setLng(pos.coords.longitude.toFixed(6)); },
      () => setError('Location permission was not granted. Enter the coordinates manually.'),
    );
  }

  return (
    <form className="form-grid" onSubmit={submit} id="store-form">
      {initial?.verificationStatus === 'REJECTED' && <Notice type="info">Saving changes resubmits this store for admin review.</Notice>}
      {error && <Notice type="error">{error}</Notice>}
      <div className="field">
        <label htmlFor="s-name">Store name</label>
        <input id="s-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength="255" />
      </div>
      <div className="field">
        <label htmlFor="s-address">Street address</label>
        <input id="s-address" value={address} onChange={(e) => setAddress(e.target.value)} required maxLength="500" />
      </div>
      <div className="field">
        <label htmlFor="s-city">City</label>
        <input id="s-city" value={city} onChange={(e) => setCity(e.target.value)} required maxLength="255" />
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="s-lat">Latitude</label>
          <input id="s-lat" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="s-lng">Longitude</label>
          <input id="s-lng" inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} required />
        </div>
      </div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={useDevice}>📍 Use my current position (if you're at the store)</button>
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

function VendorCategorySelect({ value, onChange }) {
  const { categories } = useCategories();
  return (
    <select id="of-category" value={value} onChange={(e) => onChange(e.target.value)} required>
      {groupCategories(categories).map((parent) => (
        parent.children.length === 0
          ? <option key={parent.code} value={parent.code}>{parent.name}</option>
          : (
            <optgroup key={parent.code} label={parent.name}>
              <option value={parent.code}>{parent.name} (general)</option>
              {parent.children.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </optgroup>
          )
      ))}
    </select>
  );
}

function OfferForm({ initial, stores, onSave, onCancel, loading }) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [desc, setDesc] = useState(initial?.description ?? '');
  const [category, setCategory] = useState(initial?.category ?? 'OTHER');
  const [sid, setSid] = useState(initial?.storeId ?? '');
  const [startAt, setStartAt] = useState(toLocalInput(initial?.startAt));
  const [endAt, setEndAt] = useState(toLocalInput(initial?.endAt));
  const [error, setError] = useState(null);

  function submit(e) {
    e.preventDefault();
    if (initial) {
      // The validity window is fixed after creation; offer-service only edits content.
      onSave({ title: title.trim(), description: desc.trim(), category });
      return;
    }
    if (new Date(endAt) <= new Date(startAt)) {
      setError('The end date must be after the start date.');
      return;
    }
    setError(null);
    onSave({ storeId: sid, title: title.trim(), description: desc.trim(), category,
      startAt: new Date(startAt).toISOString(), endAt: new Date(endAt).toISOString() });
  }

  return (
    <form className="form-grid" onSubmit={submit} id="offer-form">
      {error && <Notice type="error">{error}</Notice>}
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
        <textarea id="of-desc" value={desc} onChange={(e) => setDesc(e.target.value)} required maxLength="2000" />
        <span className="field-hint">{desc.length}/2000</span>
      </div>
      <div className="field">
        <label htmlFor="of-category">Category</label>
        <VendorCategorySelect value={category} onChange={setCategory} />
      </div>
      {!initial && (
        <div className="form-row">
          <div className="field">
            <label htmlFor="of-start">Starts</label>
            <input id="of-start" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="of-end">Ends</label>
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

export function StoresTab() {
  const { headers } = useAuth();
  const toast = useToast();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // null | 'create' | store

  useEffect(() => {
    setLoading(true);
    request('/api/vendors/stores?size=50', { headers })
      .then((result) => setStores(result.stores ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [headers]);

  async function saveStore(data) {
    setSaving(true); setError(null);
    try {
      if (modal === 'create') {
        const created = await request('/api/vendors/stores', { method: 'POST', body: JSON.stringify(data), headers });
        setStores((s) => [created, ...s]);
        toast(`"${created.name}" submitted for verification`);
      } else {
        const updated = await request(`/api/vendors/stores/${modal.id}`, { method: 'PATCH', body: JSON.stringify(data), headers });
        setStores((s) => s.map((st) => (st.id === updated.id ? updated : st)));
        toast(`"${updated.name}" updated`);
      }
      setModal(null);
    } catch (err) {
      setError(err.message);
    } finally { setSaving(false); }
  }

  return (
    <div>
      {error && <Notice type="error">{error}</Notice>}
      <div className="section-header">
        <h2 className="section-title">My stores</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setModal('create')} id="create-store-btn">+ New store</button>
      </div>
      {loading ? <div className="center-pad"><Spinner /></div> : stores.length === 0 ? (
        <EmptyState icon="🏪" title="Add your first store" action={<button className="btn btn-primary" onClick={() => setModal('create')}>Create store</button>}>
          Stores are reviewed by an admin before their offers can be published.
        </EmptyState>
      ) : (
        <div className="list-items">
          {stores.map((store) => (
            <div className="list-item" key={store.id} id={`store-item-${store.id}`}>
              <div className="list-item-body">
                <div className="list-item-heading">
                  <div className="list-item-title">{store.name}</div>
                  <StatusBadge status={store.verificationStatus} />
                </div>
                <div className="list-item-meta">{store.address}, {store.city}</div>
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

export function OffersTab() {
  const { headers } = useAuth();
  const { categories } = useCategories();
  const toast = useToast();
  const [offers, setOffers] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // null | 'create' | offer

  useEffect(() => {
    setLoading(true);
    Promise.all([request('/api/offers?size=50', { headers }), request('/api/vendors/stores?size=50', { headers })])
      .then(([o, s]) => { setOffers(o.offers ?? []); setStores(s.stores ?? []); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [headers]);

  const replace = (updated) => setOffers((o) => o.map((of) => (of.id === updated.id ? updated : of)));
  const storeById = useMemo(() => Object.fromEntries(stores.map((s) => [s.id, s])), [stores]);

  async function saveOffer(data) {
    setSaving(true); setError(null);
    try {
      if (modal === 'create') {
        const created = await request('/api/offers', { method: 'POST', body: JSON.stringify(data), headers });
        setOffers((o) => [created, ...o]);
        toast(`"${created.title}" saved as a draft`);
      } else {
        replace(await request(`/api/offers/${modal.id}`, { method: 'PATCH', body: JSON.stringify(data), headers }));
        toast('Offer updated');
      }
      setModal(null);
    } catch (err) {
      setError(err.message);
    } finally { setSaving(false); }
  }

  async function runAction(offer, action) {
    setError(null);
    try {
      if (action === 'delete') {
        if (!window.confirm(`Delete "${offer.title}"? This cannot be undone.`)) return;
        await request(`/api/offers/${offer.id}`, { method: 'DELETE', headers });
        setOffers((o) => o.filter((of) => of.id !== offer.id));
        toast('Offer deleted');
        return;
      }
      if (action === 'expire' && !window.confirm(`End "${offer.title}" now? Ended offers cannot be republished.`)) return;
      replace(await request(`/api/offers/${offer.id}/${action}`, { method: 'POST', headers }));
      toast(`Offer ${ACTION_LABELS[action][2]}`);
    } catch (err) {
      setError(err.message);
    }
  }

  function newOffer() {
    if (stores.length === 0) {
      setError('Create a store first, on the Stores tab.');
      return;
    }
    setModal('create');
  }

  return (
    <div>
      {error && <Notice type="error">{error}</Notice>}
      <div className="section-header">
        <h2 className="section-title">My offers</h2>
        <button className="btn btn-primary btn-sm" id="create-offer-btn" onClick={newOffer}>+ New offer</button>
      </div>
      {loading ? <div className="center-pad"><Spinner /></div> : offers.length === 0 ? (
        <EmptyState icon="🏷️" title="No offers yet" action={<button className="btn btn-primary" onClick={newOffer}>Create your first offer</button>}>
          Create a draft now; you can publish it once your store is verified.
        </EmptyState>
      ) : (
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
                    {store ? `${store.name} · ${store.city}` : 'Store'} · {categoryLabel(categories, offer.category)} · {formatDate(offer.startAt)} – {formatDate(offer.endAt)}
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
