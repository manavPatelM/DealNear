import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { request } from '../api.js';
import { useCategories, useLocationPref } from '../state.jsx';
import { categoryCodesWithChildren, groupCategories } from '../lib/offers.js';
import { discoveryParams } from '../lib/location.js';
import { CategoryTiles, OfferGrid, useSavedOffers } from '../components/Offers.jsx';
import { EmptyState, NotFound, Notice, PageHeading, SkeletonCards } from '../ui.jsx';

const PAGE_SIZE = 12;

/** Loads one page of offers, nearby (discovery) or from the public listing, with optional categories. */
function useOfferResults({ mode, location, categoryCodes, categoryCode, page, size = PAGE_SIZE }) {
  const [state, setState] = useState({ offers: [], totalPages: 0, totalElements: 0, loading: true, error: null });
  const key = JSON.stringify([mode, location, categoryCodes, categoryCode, page, size]);

  useEffect(() => {
    let cancelled = false;
    if (mode === 'nearby' && !location) {
      setState({ offers: [], totalPages: 0, totalElements: 0, loading: false, error: null });
      return undefined;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    const path = mode === 'nearby'
      ? `/api/discovery/offers?${discoveryParams(location, { category: (categoryCodes ?? []).join(','), page, size })}`
      : `/api/offers/public?${new URLSearchParams({ page: String(page), size: String(size), ...(categoryCode ? { category: categoryCode } : {}) })}`;
    request(path)
      .then((result) => {
        if (!cancelled) {
          setState({ offers: result.offers ?? [], totalPages: result.totalPages ?? 0,
            totalElements: result.totalElements ?? 0, loading: false, error: null });
        }
      })
      .catch((err) => { if (!cancelled) setState((s) => ({ ...s, loading: false, error: err.message })); });
    return () => { cancelled = true; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return state;
}

function Pager({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="pager" aria-label="Pagination">
      <button className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => onPage(page - 1)}>← Previous</button>
      <span>Page {page + 1} of {totalPages}</span>
      <button className="btn btn-secondary btn-sm" disabled={page + 1 >= totalPages} onClick={() => onPage(page + 1)}>Next →</button>
    </nav>
  );
}

function OfferSection({ title, meta, link, results, saved }) {
  if (results.loading) {
    return <section className="home-section"><div className="section-header"><h2 className="section-title">{title}</h2></div><SkeletonCards /></section>;
  }
  // Collections only render when they have real offers (no filler content).
  if (results.error || results.offers.length === 0) return null;
  return (
    <section className="home-section">
      <div className="section-header">
        <h2 className="section-title">{title}</h2>
        {meta && <span className="section-meta">{meta}</span>}
        {link && <Link to={link.to} className="section-link">{link.label} →</Link>}
      </div>
      <OfferGrid offers={results.offers} saved={saved} />
    </section>
  );
}

export function HomePage() {
  const { location, openPicker } = useLocationPref();
  const navigate = useNavigate();
  const saved = useSavedOffers();
  const nearby = useOfferResults({ mode: 'nearby', location, page: 0, size: 8 });
  const recent = useOfferResults({ mode: 'all', page: 0, size: 8 });

  function exploreNearby() {
    if (!location) openPicker();
    else navigate('/nearby');
  }

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-inner">
          <span className="eyebrow">Local deals, closer to you</span>
          <h1>Discover the best deals around you.</h1>
          <p className="hero-subtitle">From your favourite cafés to local fashion stores, discover offers worth stepping out for.</p>
          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={exploreNearby} id="hero-explore-nearby">Explore nearby offers</button>
            <Link className="btn btn-secondary btn-lg" to="/business/register" id="hero-promote">Promote your business</Link>
          </div>
          {!location && (
            <p className="hero-hint">
              <button className="btn-link" onClick={openPicker} id="hero-set-location">Set your location</button> to see offers near you. Location access is optional.
            </p>
          )}
        </div>
      </section>

      <div className="page">
        <section className="home-section">
          <div className="section-header">
            <h2 className="section-title">Browse by category</h2>
            <Link to="/categories" className="section-link">All categories →</Link>
          </div>
          <CategoryTiles limit={12} />
        </section>

        {location && (
          <OfferSection title="Nearby for you" meta={`Within ${location.radiusKm} km of ${location.label}`}
            link={{ to: '/nearby', label: 'See all nearby' }} results={nearby} saved={saved} />
        )}
        <OfferSection title="Recently added" link={{ to: '/explore', label: 'Explore all' }} results={recent} saved={saved} />
        {!recent.loading && recent.offers.length === 0 && !nearby.offers.length && (
          <EmptyState icon="🏷️" title="No live offers yet">
            Local businesses haven't published offers here yet. Check back soon, or list your own business.
          </EmptyState>
        )}

        <section className="vendor-promo" aria-labelledby="vendor-promo-title">
          <div>
            <span className="eyebrow">For local businesses</span>
            <h2 id="vendor-promo-title">Reach customers in your neighbourhood.</h2>
            <p className="muted-copy">Publish offers that people nearby can find by location and category. Listing is free during the beta.</p>
            <Link className="btn btn-primary" to="/business/register" id="promo-register">Register your business</Link>
          </div>
          <ol className="steps">
            <li><strong>Register</strong><span>Create a business account.</span></li>
            <li><strong>Verify</strong><span>Our team reviews your store.</span></li>
            <li><strong>Publish offers</strong><span>Go live within your validity window.</span></li>
            <li><strong>Track results</strong><span>See how customers engage (coming soon).</span></li>
          </ol>
        </section>
      </div>
    </div>
  );
}

function CategorySelect({ value, onChange, id }) {
  const { categories } = useCategories();
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">All categories</option>
      {groupCategories(categories).map((parent) => (
        parent.children.length === 0
          ? <option key={parent.code} value={parent.code}>{parent.name}</option>
          : (
            <optgroup key={parent.code} label={parent.name}>
              <option value={parent.code}>All {parent.name}</option>
              {parent.children.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </optgroup>
          )
      ))}
    </select>
  );
}

/** Explore (all live offers) and Nearby (location radius), with filters kept in the URL. */
export function ExplorePage({ nearbyOnly = false }) {
  const [params, setParams] = useSearchParams();
  const { location, openPicker } = useLocationPref();
  const { categories } = useCategories();
  const saved = useSavedOffers();
  const mode = nearbyOnly || params.get('mode') === 'nearby' ? 'nearby' : 'all';
  const category = params.get('category') ?? '';
  const page = Math.max(0, Number.parseInt(params.get('page') ?? '0', 10) || 0);
  const codes = useMemo(() => categoryCodesWithChildren(categories, category), [categories, category]);
  const results = useOfferResults({ mode, location, categoryCodes: codes, categoryCode: category, page });

  function update(next) {
    const merged = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v === '' || v === null || v === undefined) merged.delete(k);
      else merged.set(k, String(v));
    }
    if (!('page' in next)) merged.delete('page');
    setParams(merged);
  }

  return (
    <div className="page">
      <PageHeading eyebrow={mode === 'nearby' ? 'Nearby deals' : 'Explore'} title={mode === 'nearby' ? 'Offers near you' : 'Explore all offers'}>
        {mode === 'nearby'
          ? (location ? `Within ${location.radiusKm} km of ${location.label}, nearest first.` : 'Choose a location to see offers around you.')
          : 'Every live offer from verified local businesses, newest first.'}
      </PageHeading>

      <div className="filter-bar" role="search">
        {!nearbyOnly && (
          <div className="segmented" role="tablist" aria-label="Result mode">
            <button role="tab" aria-selected={mode === 'all'} className={mode === 'all' ? 'active' : ''} onClick={() => update({ mode: '' })} id="mode-all">All offers</button>
            <button role="tab" aria-selected={mode === 'nearby'} className={mode === 'nearby' ? 'active' : ''} onClick={() => update({ mode: 'nearby' })} id="mode-nearby">Near me</button>
          </div>
        )}
        <div className="field field-inline">
          <label htmlFor="filter-category">Category</label>
          <CategorySelect id="filter-category" value={category} onChange={(v) => update({ category: v })} />
        </div>
        {mode === 'nearby' && (
          <button className="btn btn-secondary btn-sm" onClick={openPicker} id="filter-location">
            📍 {location ? `${location.label} · ${location.radiusKm} km` : 'Set location'}
          </button>
        )}
        {(category || params.get('mode')) && !nearbyOnly && (
          <button className="btn btn-ghost btn-sm" onClick={() => setParams(new URLSearchParams())} id="clear-filters">Clear filters</button>
        )}
      </div>

      {results.error && <Notice type="error">{results.error}</Notice>}
      {mode === 'nearby' && !location ? (
        <EmptyState icon="📍" title="Where should we look?" action={<button className="btn btn-primary" onClick={openPicker}>Choose location</button>}>
          Use your current location or pick a city. Location access is optional.
        </EmptyState>
      ) : results.loading ? (
        <SkeletonCards count={6} />
      ) : results.offers.length === 0 ? (
        <EmptyState icon="🔍" title="No offers match"
          action={category ? <button className="btn btn-secondary" onClick={() => update({ category: '' })}>Show all categories</button> : null}>
          {mode === 'nearby' ? 'Try a larger radius or another category.' : 'Try another category, or check back soon.'}
        </EmptyState>
      ) : (
        <>
          <p className="result-count" aria-live="polite">{results.totalElements} offer{results.totalElements === 1 ? '' : 's'}</p>
          <OfferGrid offers={results.offers} saved={saved} />
          <Pager page={page} totalPages={results.totalPages} onPage={(p) => update({ page: p || '' })} />
        </>
      )}
    </div>
  );
}

export function CategoriesPage() {
  const { categories, loading, error } = useCategories();
  return (
    <div className="page">
      <PageHeading eyebrow="Categories" title="Browse by category">Find offers from the kinds of places you like.</PageHeading>
      {error && <Notice type="error">{error}</Notice>}
      {loading ? <SkeletonCards /> : (
        <div className="category-directory">
          {groupCategories(categories).map((parent) => (
            <section key={parent.code} className="category-card">
              <Link to={`/categories/${parent.slug}`} className="category-card-head">
                <span className="category-icon" aria-hidden="true">{parent.icon ?? '🏷️'}</span>
                <h2>{parent.name}</h2>
              </Link>
              {parent.description && <p className="muted-copy">{parent.description}</p>}
              {parent.children.length > 0 && (
                <div className="chip-row">
                  {parent.children.map((c) => <Link key={c.code} to={`/categories/${c.slug}`} className="chip">{c.icon} {c.name}</Link>)}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export function CategoryPage() {
  const { slug } = useParams();
  const { categories, loading } = useCategories();
  const { location, openPicker } = useLocationPref();
  const saved = useSavedOffers();
  const [page, setPage] = useState(0);
  const category = categories.find((c) => c.slug === slug);
  const parent = category?.parentCode ? categories.find((c) => c.code === category.parentCode) : null;
  const children = category ? categories.filter((c) => c.parentCode === category.code) : [];
  const codes = useMemo(() => (category ? categoryCodesWithChildren(categories, category.code) : []), [categories, category]);
  const nearby = useOfferResults({ mode: 'nearby', location: category ? location : null, categoryCodes: codes, page: 0, size: 8 });
  const all = useOfferResults({ mode: category ? 'all' : 'nearby', location: null, categoryCode: category?.code, page });

  useEffect(() => { setPage(0); }, [slug]);
  if (loading) return <div className="page"><SkeletonCards /></div>;
  if (!category) return <NotFound title="Category not found" message="This category doesn't exist or is no longer available." />;

  return (
    <div className="page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/categories">Categories</Link>
        {parent && <> / <Link to={`/categories/${parent.slug}`}>{parent.name}</Link></>}
        {' / '}<span aria-current="page">{category.name}</span>
      </nav>
      <PageHeading eyebrow="Category" title={`${category.icon ?? ''} ${category.name}`.trim()}>
        {category.description ?? `Offers from ${category.name.toLowerCase()} near you and across the city.`}
      </PageHeading>
      {children.length > 0 && (
        <div className="chip-row" aria-label="Subcategories">
          {children.map((c) => <Link key={c.code} to={`/categories/${c.slug}`} className="chip">{c.icon} {c.name}</Link>)}
        </div>
      )}

      {location ? (
        <OfferSection title={`Near ${location.label}`} meta={`Within ${location.radiusKm} km`}
          link={{ to: `/nearby?category=${category.code}`, label: 'See all nearby' }} results={nearby} saved={saved} />
      ) : (
        <p className="muted-copy"><button className="btn-link" onClick={openPicker}>Set your location</button> to see the closest {category.name.toLowerCase()} offers first.</p>
      )}

      <section className="home-section">
        <div className="section-header"><h2 className="section-title">All {category.name} offers</h2></div>
        {all.loading ? <SkeletonCards /> : all.offers.length === 0 ? (
          <EmptyState icon={category.icon ?? '🏷️'} title="No offers in this category yet">Check back soon, or explore other categories.</EmptyState>
        ) : (
          <>
            <OfferGrid offers={all.offers} saved={saved} />
            <Pager page={page} totalPages={all.totalPages} onPage={setPage} />
          </>
        )}
      </section>
    </div>
  );
}
