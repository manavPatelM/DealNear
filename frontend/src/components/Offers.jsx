import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { request } from '../api.js';
import { useAuth, useCategories, useToast } from '../state.jsx';
import { categoryLabel, timeLeft } from '../lib/offers.js';
import { formatDistance } from '../lib/location.js';

/** Saved-offer IDs for the signed-in customer, with an optimistic toggle. */
export function useSavedOffers() {
  const auth = useAuth();
  const toast = useToast();
  const [savedRefs, setSavedRefs] = useState([]);
  const isCustomer = auth.role === 'CUSTOMER';

  const reload = useCallback(async () => {
    if (!isCustomer) { setSavedRefs([]); return; }
    try {
      const result = await request('/api/auth/saved-offers', { headers: auth.headers });
      setSavedRefs(result.savedOffers ?? []);
    } catch { /* keep current list */ }
  }, [auth.headers, isCustomer]);

  useEffect(() => { reload(); }, [reload]);
  const savedIds = useMemo(() => new Set(savedRefs.map((s) => s.offerId)), [savedRefs]);

  const toggle = useCallback(async (offerId) => {
    if (!isCustomer) return;
    const saved = savedIds.has(offerId);
    try {
      await request(`/api/auth/saved-offers/${offerId}`, { method: saved ? 'DELETE' : 'POST', headers: auth.headers });
      toast(saved ? 'Removed from saved offers' : 'Saved');
      await reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  }, [auth.headers, isCustomer, reload, savedIds, toast]);

  return { savedRefs, savedIds, toggle, canSave: isCustomer, reload };
}

export function OfferCard({ offer, saved, canSave, onToggleSave }) {
  const { categories } = useCategories();
  const distance = formatDistance(offer.distanceKm);
  const ends = offer.endAt ? timeLeft(offer.endAt) : null;
  return (
    <article className="offer-card">
      <div className="offer-card-top">
        <span className="category-tag">{categoryLabel(categories, offer.category)}</span>
        {canSave && (
          <button className={`save-btn ${saved ? 'saved' : ''}`} onClick={() => onToggleSave(offer.id)}
            aria-label={saved ? 'Unsave offer' : 'Save offer'} aria-pressed={saved} id={`save-btn-${offer.id}`}>
            {saved ? '♥' : '♡'}
          </button>
        )}
      </div>
      <h3 className="offer-title"><Link to={`/offers/${offer.id}`} className="stretched-link">{offer.title}</Link></h3>
      <p className="offer-store">
        <span className="verified-dot" title="Verified business" aria-label="Verified business">✓</span>
        {offer.storeName} · {offer.storeCity}
      </p>
      <p className="offer-desc">{offer.description}</p>
      <div className="offer-card-meta">
        {distance && <span>{distance}</span>}
        {ends && <span className={ends.startsWith('Ends in') && !ends.includes('days') ? 'ending-soon' : ''}>{ends}</span>}
      </div>
    </article>
  );
}

export function OfferGrid({ offers, saved }) {
  return (
    <div className="offer-grid">
      {offers.map((offer) => (
        <OfferCard key={offer.id} offer={offer} saved={saved.savedIds.has(offer.id)} canSave={saved.canSave} onToggleSave={saved.toggle} />
      ))}
    </div>
  );
}

export function CategoryTiles({ limit }) {
  const { categories, loading } = useCategories();
  const top = categories.filter((c) => !c.parentCode).slice(0, limit ?? undefined);
  if (loading) return <div className="category-tiles skeleton-row" aria-hidden="true" />;
  if (top.length === 0) return null;
  return (
    <div className="category-tiles">
      {top.map((c) => (
        <Link key={c.code} to={`/categories/${c.slug}`} className="category-tile" id={`category-tile-${c.slug}`}>
          <span className="category-icon" aria-hidden="true">{c.icon ?? '🏷️'}</span>
          <span>{c.name}</span>
        </Link>
      ))}
    </div>
  );
}
