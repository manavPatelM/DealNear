import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { request } from '../api.js';
import { useAuth, useCategories, useToast } from '../state.jsx';
import { categoryLabel, formatDate, REPORT_REASONS, timeLeft } from '../lib/offers.js';
import { OfferGrid, useSavedOffers } from '../components/Offers.jsx';
import { EmptyState, NotFound, Notice, SkeletonCards, Spinner } from '../ui.jsx';

const DEFAULT_TITLE = document.title;

function useLoad(path) {
  const [state, setState] = useState({ data: null, loading: true, notFound: false, error: null });
  useEffect(() => {
    let cancelled = false;
    setState({ data: null, loading: true, notFound: false, error: null });
    request(path)
      .then((data) => { if (!cancelled) setState({ data, loading: false, notFound: false, error: null }); })
      .catch((err) => {
        if (cancelled) return;
        const notFound = /not found/i.test(err.message);
        setState({ data: null, loading: false, notFound, error: notFound ? null : err.message });
      });
    return () => { cancelled = true; };
  }, [path]);
  return state;
}

function ShareButtons({ title }) {
  const toast = useToast();
  const url = window.location.href;
  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch { /* user cancelled */ }
    } else {
      copy();
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast('Link copied');
    } catch {
      toast('Could not copy the link', 'error');
    }
  }
  return (
    <>
      <button className="btn btn-secondary btn-sm" onClick={share} id="share-btn">↗ Share</button>
      <button className="btn btn-ghost btn-sm" onClick={copy} id="copy-link-btn">⧉ Copy link</button>
    </>
  );
}

function ReportForm({ offerId, onDone }) {
  const auth = useAuth();
  const toast = useToast();
  const [reason, setReason] = useState('MISLEADING');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await request(`/api/offers/${offerId}/reports`, { method: 'POST', headers: auth.headers, body: JSON.stringify({ reason, details }) });
      toast('Thanks — our team will review this offer.');
      onDone();
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  }

  return (
    <form className="form-grid report-form" onSubmit={submit}>
      {error && <Notice type="error">{error}</Notice>}
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
        <button type="button" className="btn btn-secondary btn-sm" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn btn-danger btn-sm" disabled={busy} id="submit-report-btn">{busy ? <Spinner /> : null} Send report</button>
      </div>
    </form>
  );
}

export function OfferPage() {
  const { offerId } = useParams();
  const auth = useAuth();
  const { categories } = useCategories();
  const saved = useSavedOffers();
  const offer = useLoad(`/api/offers/public/${offerId}`);
  const [storeOffers, setStoreOffers] = useState([]);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    if (!offer.data) return;
    document.title = `${offer.data.title} · DealNear`;
    request(`/api/offers/public?storeId=${offer.data.storeId}&size=7`)
      .then((r) => setStoreOffers((r.offers ?? []).filter((o) => o.id !== offerId).slice(0, 6)))
      .catch(() => setStoreOffers([]));
    return () => { document.title = DEFAULT_TITLE; };
  }, [offer.data, offerId]);

  if (offer.loading) return <div className="page"><SkeletonCards count={1} /></div>;
  if (offer.notFound) return <NotFound title="Offer not available" message="This offer has ended, was removed, or never existed." />;
  if (offer.error) return <div className="page"><Notice type="error">{offer.error}</Notice></div>;
  const o = offer.data;
  const isCustomer = auth.role === 'CUSTOMER';
  const isSaved = saved.savedIds.has(o.id);

  return (
    <div className="page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/explore">Explore</Link> / <span aria-current="page">{o.title}</span>
      </nav>
      <article className="detail-layout">
        <div className="detail-main card card-padded">
          <div className="detail-meta">
            <span className="category-tag">{categoryLabel(categories, o.category)}</span>
            <span className="status-pill status-active">Active</span>
            <span className="muted-copy">{timeLeft(o.endAt)}</span>
          </div>
          <h1 className="detail-title">{o.title}</h1>
          <p className="detail-description">{o.description}</p>
          <dl className="fact-list">
            <div><dt>Valid from</dt><dd>{formatDate(o.startAt)}</dd></div>
            <div><dt>Valid until</dt><dd>{formatDate(o.endAt)}</dd></div>
          </dl>
          <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
            {isCustomer && (
              <button className={`btn btn-sm ${isSaved ? 'btn-secondary' : 'btn-primary'}`} onClick={() => saved.toggle(o.id)} id="detail-save-btn">
                {isSaved ? '♥ Saved' : '♡ Save offer'}
              </button>
            )}
            <ShareButtons title={o.title} />
            {isCustomer && !reporting && (
              <button className="btn btn-ghost btn-sm" onClick={() => setReporting(true)} id="report-offer-btn">⚑ Report</button>
            )}
          </div>
          {!auth.token && <p className="muted-copy"><Link to={`/auth/login?next=/offers/${o.id}`}>Sign in</Link> to save or report this offer.</p>}
          {reporting && <ReportForm offerId={o.id} onDone={() => setReporting(false)} />}
        </div>
        <aside className="detail-side card card-padded">
          <span className="eyebrow">Offered by</span>
          <h2 className="store-name"><span className="verified-dot" aria-label="Verified business">✓</span> {o.storeName}</h2>
          <p className="muted-copy">{o.storeCity} · Verified business</p>
          <Link to={`/stores/${o.storeId}`} className="btn btn-secondary btn-block" id="view-store-btn">View store</Link>
        </aside>
      </article>

      {storeOffers.length > 0 && (
        <section className="home-section">
          <div className="section-header"><h2 className="section-title">More from {o.storeName}</h2></div>
          <OfferGrid offers={storeOffers} saved={saved} />
        </section>
      )}
    </div>
  );
}

export function StorePage() {
  const { storeId } = useParams();
  const saved = useSavedOffers();
  const store = useLoad(`/api/vendors/stores/public/${storeId}`);
  const offers = useLoad(`/api/offers/public?storeId=${storeId}&size=50`);

  useEffect(() => {
    if (store.data) document.title = `${store.data.name} · DealNear`;
    return () => { document.title = DEFAULT_TITLE; };
  }, [store.data]);

  if (store.loading) return <div className="page"><SkeletonCards count={1} /></div>;
  if (store.notFound) return <NotFound title="Store not available" message="This store doesn't exist or isn't verified yet." />;
  if (store.error) return <div className="page"><Notice type="error">{store.error}</Notice></div>;
  const s = store.data;
  const list = offers.data?.offers ?? [];

  return (
    <div className="page">
      <header className="store-hero card card-padded">
        <div className="store-avatar" aria-hidden="true">🏪</div>
        <div>
          <h1>{s.name}</h1>
          <p className="muted-copy"><span className="verified-dot" aria-hidden="true">✓</span> Verified business · {s.city}</p>
        </div>
        <div className="store-hero-actions"><ShareButtons title={s.name} /></div>
      </header>
      <section className="home-section">
        <div className="section-header">
          <h2 className="section-title">Active offers</h2>
          <span className="section-meta">{list.length} live</span>
        </div>
        {offers.loading ? <SkeletonCards /> : list.length === 0 ? (
          <EmptyState icon="🏷️" title="No active offers right now">This store has no live offers at the moment.</EmptyState>
        ) : <OfferGrid offers={list} saved={saved} />}
      </section>
    </div>
  );
}
