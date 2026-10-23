import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { request } from '../api.js';
import { useAuth } from '../state.jsx';
import { authFromToken } from '../lib/auth.js';
import { formatDate } from '../lib/offers.js';
import { roleHome } from '../components/Layout.jsx';
import { useSavedOffers } from '../components/Offers.jsx';
import { EmptyState, Notice, PageHeading, Spinner } from '../ui.jsx';

/** Only allow same-site relative redirects after sign-in. */
function safeNext(next) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

function CredentialsForm({ idPrefix, submitLabel, onSubmit, busy, error, footer, extra }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <form className="form-grid" onSubmit={(e) => { e.preventDefault(); onSubmit(email, password); }} noValidate={false}>
      {error && <Notice type="error">{error}</Notice>}
      <div className="field">
        <label htmlFor={`${idPrefix}-email`}>Email address</label>
        <input id={`${idPrefix}-email`} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-pass`}>Password</label>
        <input id={`${idPrefix}-pass`} type="password" autoComplete={idPrefix === 'login' ? 'current-password' : 'new-password'}
          minLength="8" maxLength="128" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {idPrefix !== 'login' && <span className="field-hint">At least 8 characters.</span>}
      </div>
      {extra}
      <button className="btn btn-primary btn-block btn-lg" disabled={busy} type="submit" id={`${idPrefix}-submit`}>
        {busy ? <Spinner /> : null} {submitLabel}
      </button>
      {footer}
    </form>
  );
}

function useAuthSubmit(path) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(email, password) {
    setBusy(true); setError(null);
    try {
      const result = await request(path, { method: 'POST', body: JSON.stringify({ email, password }) });
      auth.signIn(result.accessToken);
      const role = authFromToken(result.accessToken).role;
      navigate(safeNext(params.get('next')) ?? roleHome(role), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  }
  return { onSubmit: submit, busy, error };
}

export function LoginPage() {
  const auth = useAuth();
  const form = useAuthSubmit('/api/auth/login');
  if (auth.token) return <Navigate to={roleHome(auth.role)} replace />;
  return (
    <div className="page page-narrow">
      <div className="card card-padded auth-card">
        <h1>Welcome back</h1>
        <p className="muted-copy">Customers, businesses and admins all sign in here.</p>
        <CredentialsForm idPrefix="login" submitLabel="Sign in" {...form}
          footer={(
            <p className="auth-toggle">
              New here? <Link to="/auth/register">Create a customer account</Link> or <Link to="/business/register">register a business</Link>.
            </p>
          )} />
      </div>
    </div>
  );
}

export function RegisterPage() {
  const auth = useAuth();
  const form = useAuthSubmit('/api/auth/register');
  if (auth.token) return <Navigate to={roleHome(auth.role)} replace />;
  return (
    <div className="page page-narrow">
      <div className="card card-padded auth-card">
        <h1>Create your account</h1>
        <p className="muted-copy">Save offers and come back to them later. Browsing never needs an account.</p>
        <CredentialsForm idPrefix="register" submitLabel="Create account" {...form}
          footer={<p className="auth-toggle">Already have an account? <Link to="/auth/login">Sign in</Link></p>} />
      </div>
    </div>
  );
}

export function BusinessRegisterPage() {
  const auth = useAuth();
  const form = useAuthSubmit('/api/auth/register/vendor');
  if (auth.role === 'VENDOR') return <Navigate to="/business/offers" replace />;
  return (
    <div className="page">
      <div className="business-register">
        <section>
          <span className="eyebrow">For businesses</span>
          <h1>Reach customers in your neighbourhood.</h1>
          <p className="page-lead">List your shop, café or service and publish offers that nearby customers can find by location and category.</p>
          <ol className="steps steps-vertical">
            <li><strong>Register</strong><span>Create your business account.</span></li>
            <li><strong>Add your store</strong><span>Name, address and map location.</span></li>
            <li><strong>Get verified</strong><span>Our team reviews each store before its offers go live.</span></li>
            <li><strong>Publish offers</strong><span>Drafts go live within the validity window you choose.</span></li>
          </ol>
        </section>
        <div className="card card-padded auth-card">
          <h2>Create a business account</h2>
          {auth.token ? (
            <Notice type="info">You're signed in with a {auth.role?.toLowerCase()} account. Sign out first to register a business.</Notice>
          ) : (
            <CredentialsForm idPrefix="vendor" submitLabel="Create business account" {...form}
              footer={<p className="auth-toggle">Already registered? <Link to="/auth/login">Sign in</Link></p>} />
          )}
        </div>
      </div>
    </div>
  );
}

export function SavedPage() {
  const saved = useSavedOffers();
  const [details, setDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const idsKey = saved.savedRefs.map((s) => s.offerId).join(',');

  useEffect(() => {
    // The public listing accepts up to 50 ids; older references beyond that show as unavailable.
    const ids = saved.savedRefs.slice(0, 50).map((s) => s.offerId);
    if (ids.length === 0) { setDetails({}); setLoading(false); return; }
    setLoading(true);
    request(`/api/offers/public?size=50&ids=${ids.join(',')}`)
      .then((r) => setDetails(Object.fromEntries((r.offers ?? []).map((o) => [o.id, o]))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [idsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page">
      <PageHeading eyebrow="My account" title="Saved offers">Offers you've bookmarked. Ended offers are marked as no longer available.</PageHeading>
      {saved.savedRefs.length === 0 ? (
        <EmptyState icon="♡" title="Nothing saved yet" action={<Link className="btn btn-primary" to="/explore">Explore offers</Link>}>
          Tap ♡ on any offer to keep it here.
        </EmptyState>
      ) : (
        <ul className="list-items">
          {saved.savedRefs.map((ref) => {
            const offer = details[ref.offerId];
            return (
              <li key={ref.id} className="list-item">
                <div className="list-item-body">
                  {offer ? (
                    <>
                      <Link to={`/offers/${offer.id}`} className="list-item-title">{offer.title}</Link>
                      <div className="list-item-meta">{offer.storeName} · {offer.storeCity} · until {formatDate(offer.endAt)}</div>
                    </>
                  ) : (
                    <span className="muted-copy">{loading ? 'Loading…' : 'No longer available'}</span>
                  )}
                </div>
                <div className="list-item-actions">
                  <button className="btn btn-danger btn-sm" onClick={() => saved.toggle(ref.offerId)} id={`remove-saved-${ref.offerId}`}>Remove</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
