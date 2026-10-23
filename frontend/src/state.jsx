import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { bearer, request, UNAUTHORIZED_EVENT } from './api.js';
import { authFromToken, clearToken, loadAuth, parseToken, saveToken, SIGNED_OUT, TOKEN_KEY } from './lib/auth.js';
import { loadLocation, saveLocation } from './lib/location.js';

const AuthContext = createContext(null);
const CategoriesContext = createContext(null);
const LocationContext = createContext(null);
const ToastContext = createContext(null);

export const useAuth = () => useContext(AuthContext);
export const useCategories = () => useContext(CategoriesContext);
export const useLocationPref = () => useContext(LocationContext);
export const useToast = () => useContext(ToastContext);

function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => loadAuth());
  const [sessionExpired, setSessionExpired] = useState(false);

  const signIn = useCallback((token) => {
    saveToken(token);
    setAuth(authFromToken(token));
    setSessionExpired(false);
  }, []);

  const signOut = useCallback(() => {
    clearToken();
    setAuth(SIGNED_OUT);
  }, []);

  useEffect(() => {
    function expired() {
      clearToken();
      setAuth(SIGNED_OUT);
      setSessionExpired(true);
    }
    function syncFromOtherTab(event) {
      if (event.key === null || event.key === TOKEN_KEY) setAuth(loadAuth());
    }
    window.addEventListener(UNAUTHORIZED_EVENT, expired);
    window.addEventListener('storage', syncFromOtherTab);
    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, expired);
      window.removeEventListener('storage', syncFromOtherTab);
    };
  }, []);

  // Sign out when the token's real expiry passes while the page stays open.
  const timer = useRef(null);
  useEffect(() => {
    clearTimeout(timer.current);
    if (!auth.token) return undefined;
    const exp = parseToken(auth.token)?.exp ?? 0;
    const delay = Math.min(Math.max(exp * 1000 - Date.now(), 0), 2 ** 31 - 1);
    timer.current = setTimeout(() => window.dispatchEvent(new Event(UNAUTHORIZED_EVENT)), delay);
    return () => clearTimeout(timer.current);
  }, [auth.token]);

  const value = useMemo(() => ({
    ...auth,
    headers: bearer(auth.token),
    signIn,
    signOut,
    sessionExpired,
    dismissSessionExpired: () => setSessionExpired(false),
  }), [auth, signIn, signOut, sessionExpired]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function CategoriesProvider({ children }) {
  const [state, setState] = useState({ categories: [], loading: true, error: null });

  const reload = useCallback(async () => {
    try {
      const result = await request('/api/categories');
      setState({ categories: result.categories ?? [], loading: false, error: null });
    } catch (err) {
      setState((current) => ({ ...current, loading: false, error: err.message }));
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  const value = useMemo(() => ({ ...state, reload }), [state, reload]);
  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

function LocationProvider({ children }) {
  const [location, setLocationState] = useState(() => loadLocation());
  const [pickerOpen, setPickerOpen] = useState(false);
  const setLocation = useCallback((next) => {
    saveLocation(next);
    setLocationState(next);
  }, []);
  const value = useMemo(() => ({
    location, setLocation, pickerOpen, openPicker: () => setPickerOpen(true), closePicker: () => setPickerOpen(false),
  }), [location, setLocation, pickerOpen]);
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((text, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((list) => [...list, { id, text, type }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4000);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`toast toast-${t.type}`} role="status">{t.text}</div>)}
      </div>
    </ToastContext.Provider>
  );
}

export function AppProviders({ children }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <CategoriesProvider>
          <LocationProvider>{children}</LocationProvider>
        </CategoriesProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
