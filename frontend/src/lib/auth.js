// Token helpers kept free of React/Vite APIs so they can be unit tested with `node --test`.

export const TOKEN_KEY = 'dealnear.token';

export function parseToken(token) {
  if (!token) return null;
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), '=')));
  } catch {
    return null;
  }
}

/** Mirrors the services: a token without a numeric `exp` is treated as expired. */
export function isTokenExpired(payload, nowMs = Date.now()) {
  return !payload || typeof payload.exp !== 'number' || payload.exp * 1000 <= nowMs;
}

export const SIGNED_OUT = Object.freeze({ token: null, role: null, userId: null });

export function authFromToken(token, nowMs = Date.now()) {
  const payload = parseToken(token);
  if (isTokenExpired(payload, nowMs)) return SIGNED_OUT;
  return { token, role: payload.role ?? null, userId: payload.sub ?? null };
}

export function loadAuth(storage = globalThis.localStorage) {
  let token = null;
  try { token = storage?.getItem(TOKEN_KEY) ?? null; } catch { /* storage unavailable */ }
  const auth = authFromToken(token);
  if (token && !auth.token) clearToken(storage);
  return auth;
}

export function saveToken(token, storage = globalThis.localStorage) {
  try { storage?.setItem(TOKEN_KEY, token); } catch { /* storage unavailable */ }
}

export function clearToken(storage = globalThis.localStorage) {
  try { storage?.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ }
}
