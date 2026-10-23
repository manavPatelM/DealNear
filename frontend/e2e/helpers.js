// API helpers that create real test data through the public gateway, the same way the
// smoke test does. Each run uses unique emails so tests never collide.
import { expect } from '@playwright/test';

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@dealnear.local';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'local-admin-password';
export const PASSWORD = 'e2e-password-123';
export const unique = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

async function call(request, method, path, { token, data, expected = [200, 201] } = {}) {
  const response = await request.fetch(path, {
    method,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    data,
  });
  expect(expected, `${method} ${path} -> ${response.status()} ${await response.text()}`).toContain(response.status());
  return response.status() === 204 ? null : response.json();
}

export async function login(request, email, password) {
  return (await call(request, 'POST', '/api/auth/login', { data: { email, password } })).accessToken;
}

/** Creates a vendor with a verified store and one published offer; returns ids. */
export async function seedPublishedOffer(request, { category = 'GROCERY', title = unique('E2E offer') } = {}) {
  const vendor = await call(request, 'POST', '/api/auth/register/vendor',
    { data: { email: `${unique('vendor')}@example.com`, password: PASSWORD } });
  const store = await call(request, 'POST', '/api/vendors/stores', {
    token: vendor.accessToken,
    data: { name: unique('E2E Store'), address: '1 Test Road', city: 'Ahmedabad', latitude: 23.0225, longitude: 72.5714 },
  });
  const admin = await login(request, ADMIN_EMAIL, ADMIN_PASSWORD);
  await call(request, 'POST', `/api/vendors/admin/stores/${store.id}/verify`, { token: admin });
  const offer = await call(request, 'POST', '/api/offers', {
    token: vendor.accessToken,
    data: {
      storeId: store.id, title, description: 'Created by the browser tests', category,
      startAt: new Date(Date.now() - 60_000).toISOString(), endAt: new Date(Date.now() + 86_400_000).toISOString(),
    },
  });
  await call(request, 'POST', `/api/offers/${offer.id}/publish`, { token: vendor.accessToken });
  return { vendorToken: vendor.accessToken, adminToken: admin, storeId: store.id, storeName: store.name, offerId: offer.id, title };
}

/** Admin takedown, so test offers never stay publicly discoverable. */
export async function removeOffer(request, adminToken, offerId) {
  await call(request, 'POST', `/api/offers/admin/offers/${offerId}/remove`,
    { token: adminToken, data: { reason: 'E2E cleanup' }, expected: [200, 409] });
}
