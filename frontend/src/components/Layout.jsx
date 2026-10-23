import React, { useState } from 'react';
import { Link, NavLink, Outlet, useLocation as useRouterLocation, useNavigate } from 'react-router-dom';
import { useAuth, useLocationPref } from '../state.jsx';
import { CITIES, cityLocation, deviceLocation, RADIUS_OPTIONS, DEFAULT_RADIUS_KM } from '../lib/location.js';
import { Modal, Notice } from '../ui.jsx';

const ROLE_HOME = { CUSTOMER: '/account/saved', VENDOR: '/business/offers', ADMIN: '/admin/vendors' };
const ROLE_LABEL = { CUSTOMER: 'My account', VENDOR: 'My business', ADMIN: 'Admin' };

export function roleHome(role) {
  return ROLE_HOME[role] ?? '/';
}

function LocationButton() {
  const { location, openPicker } = useLocationPref();
  return (
    <button className="location-btn" onClick={openPicker} id="location-btn" aria-label="Change location">
      <span aria-hidden="true">📍</span>
      <span className="location-btn-text">
        {location ? `${location.label} · ${location.radiusKm} km` : 'Choose location'}
      </span>
    </button>
  );
}

/** Location chooser: device location (optional permission), a supported city, and a radius. */
export function LocationPicker() {
  const { location, setLocation, pickerOpen, closePicker } = useLocationPref();
  const [radius, setRadius] = useState(location?.radiusKm ?? DEFAULT_RADIUS_KM);
  const [cityId, setCityId] = useState(location?.source === 'city'
    ? CITIES.find((c) => c.name === location.label)?.id ?? '' : '');
  const [notice, setNotice] = useState(null);
  const [locating, setLocating] = useState(false);

  if (!pickerOpen) return null;

  function useDevice() {
    if (!navigator.geolocation) {
      setNotice('Your browser cannot share its location. Pick a city instead.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setLocation(deviceLocation(pos.coords.latitude, pos.coords.longitude, radius));
        closePicker();
      },
      () => {
        setLocating(false);
        setNotice('Location permission was not granted. You can pick a city instead.');
      },
      { timeout: 10000 },
    );
  }

  function applyCity(e) {
    e.preventDefault();
    const next = cityLocation(cityId, radius);
    if (next) {
      setLocation(next);
      closePicker();
    }
  }

  function applyRadiusOnly(value) {
    setRadius(value);
    if (location) setLocation({ ...location, radiusKm: value });
  }

  return (
    <Modal title="Where are you looking?" onClose={closePicker}>
      <div className="form-grid">
        <fieldset className="field">
          <legend>Search radius</legend>
          <div className="chip-row" role="radiogroup">
            {RADIUS_OPTIONS.map((r) => (
              <button key={r} type="button" role="radio" aria-checked={radius === r}
                className={`chip ${radius === r ? 'chip-active' : ''}`} onClick={() => applyRadiusOnly(r)} id={`radius-${r}`}>
                {r} km
              </button>
            ))}
          </div>
        </fieldset>
        <button type="button" className="btn btn-secondary btn-block" onClick={useDevice} disabled={locating} id="use-device-location">
          {locating ? 'Locating…' : '📍 Use my current location'}
        </button>
        {notice && <Notice type="info">{notice}</Notice>}
        <div className="divider-text"><span>or choose a city</span></div>
        <form className="form-grid" onSubmit={applyCity}>
          <div className="field">
            <label htmlFor="city-select">City</label>
            <select id="city-select" value={cityId} onChange={(e) => setCityId(e.target.value)} required>
              <option value="">Select a city…</option>
              {CITIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-block" id="apply-city">Use this city</button>
        </form>
        <p className="field-hint">Your location is only used to find nearby offers and is stored on this device.</p>
      </div>
    </Modal>
  );
}

function Header() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const links = [
    ['/', 'Home', true],
    ['/explore', 'Explore Offers'],
    ['/categories', 'Categories'],
    ['/nearby', 'Nearby Deals'],
  ];

  function signOut() {
    auth.signOut();
    setMenuOpen(false);
    navigate('/');
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="brand" aria-label="DealNear home">
          <span className="brand-mark" aria-hidden="true">◎</span> DealNear
        </Link>
        <LocationButton />
        <nav className="main-nav" aria-label="Main navigation">
          {links.map(([to, label, end]) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>{label}</NavLink>
          ))}
          {auth.role !== 'VENDOR' && auth.role !== 'ADMIN' && (
            <NavLink to="/business/register" className={({ isActive }) => `nav-link nav-business ${isActive ? 'active' : ''}`}>For Businesses</NavLink>
          )}
        </nav>
        <div className="header-actions">
          {auth.role === 'CUSTOMER' && (
            <Link to="/account/saved" className="btn btn-ghost btn-sm" aria-label="Saved offers" id="saved-shortcut">♡ Saved</Link>
          )}
          {!auth.token ? (
            <>
              <Link to="/auth/login" className="btn btn-ghost btn-sm" id="login-link">Log in</Link>
              <Link to="/auth/register" className="btn btn-primary btn-sm" id="signup-link">Sign up</Link>
            </>
          ) : (
            <div className="profile-menu">
              <button className="btn btn-secondary btn-sm" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} id="profile-menu-btn">
                {ROLE_LABEL[auth.role] ?? 'Account'} ▾
              </button>
              {menuOpen && (
                <div className="menu-popover" role="menu" onClick={() => setMenuOpen(false)}>
                  <Link role="menuitem" to={roleHome(auth.role)}>{ROLE_LABEL[auth.role]}</Link>
                  <button role="menuitem" onClick={signOut} id="signout-btn">Sign out</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function BottomNav() {
  const auth = useAuth();
  const items = [
    ['/', '🏠', 'Home', true],
    ['/explore', '🔍', 'Explore'],
    [auth.role === 'CUSTOMER' ? '/account/saved' : '/auth/login', '♡', 'Saved'],
    [auth.token ? roleHome(auth.role) : '/auth/login', '👤', auth.token ? 'Profile' : 'Log in'],
  ];
  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {items.map(([to, icon, label, end]) => (
        <NavLink key={label} to={to} end={end} className={({ isActive }) => `bottom-link ${isActive ? 'active' : ''}`}>
          <span aria-hidden="true">{icon}</span>{label}
        </NavLink>
      ))}
    </nav>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <div className="brand"><span className="brand-mark" aria-hidden="true">◎</span> DealNear</div>
          <p className="muted-copy">Discover offers from local shops, cafés and businesses near you.</p>
        </div>
        <nav aria-label="Discover">
          <h4>Discover</h4>
          <Link to="/explore">Explore offers</Link>
          <Link to="/nearby">Nearby deals</Link>
          <Link to="/categories">Categories</Link>
        </nav>
        <nav aria-label="For businesses">
          <h4>For businesses</h4>
          <Link to="/business/register">List your business</Link>
          <Link to="/auth/login">Vendor sign in</Link>
        </nav>
      </div>
      <p className="footer-copy">© {new Date().getFullYear()} DealNear. A student project.</p>
    </footer>
  );
}

function SessionNotice() {
  const auth = useAuth();
  if (!auth.sessionExpired) return null;
  return (
    <div className="session-banner" role="status">
      Your session has expired. <Link to="/auth/login" onClick={auth.dismissSessionExpired}>Sign in again</Link>
      <button className="btn-icon" aria-label="Dismiss" onClick={auth.dismissSessionExpired}>&times;</button>
    </div>
  );
}

export default function Layout() {
  const { pathname } = useRouterLocation();
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">Skip to content</a>
      <Header />
      <SessionNotice />
      <main id="main" key={pathname.split('/')[1]}><Outlet /></main>
      <Footer />
      <BottomNav />
      <LocationPicker />
    </div>
  );
}
