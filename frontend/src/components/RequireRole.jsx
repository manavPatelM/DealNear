import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../state.jsx';
import { Forbidden } from '../ui.jsx';

const ROLE_NAMES = { CUSTOMER: 'customer', VENDOR: 'business', ADMIN: 'admin' };

/**
 * Client-side gate for portal pages. It only improves navigation: every API call is
 * still authorized by the services themselves.
 */
export default function RequireRole({ role, children }) {
  const auth = useAuth();
  const location = useLocation();
  if (!auth.token) {
    return <Navigate to={`/auth/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  if (auth.role !== role) return <Forbidden needed={ROLE_NAMES[role]} />;
  return children;
}
