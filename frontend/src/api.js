/* ─── API client ─────────────────────────────────────────── */
export const API = import.meta.env?.VITE_API_URL ?? '';

/** Fired when an authenticated request is rejected, so the app can sign the user out. */
export const UNAUTHORIZED_EVENT = 'dealnear:unauthorized';

export async function request(path, options = {}) {
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
    if (response.status === 401 && options.headers?.Authorization) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    const fallback =
      response.status === 401
        ? 'Invalid credentials or your session has expired'
        : response.status === 403
        ? 'Access forbidden'
        : response.status === 404
        ? 'Resource not found'
        : response.status === 409
        ? 'That action is not allowed right now'
        : response.status >= 500
        ? 'Service temporarily unavailable'
        : `Request failed (${response.status})`;
    throw new Error(body?.error?.message ?? body?.message ?? fallback);
  }
  return body;
}

export function bearer(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
