#!/usr/bin/env node
// End-to-end MVP smoke test through the public web origin (nginx -> gateway -> services).
//
//   BASE_URL=http://localhost:5173 ADMIN_EMAIL=admin@dealnear.local \
//   ADMIN_PASSWORD=local-admin-password node scripts/smoke-test.mjs
//
// It creates a uniquely named vendor, store, offer, and customer, and ends by having the
// admin remove the test offer so it does not stay discoverable. Requires Node 20+.

const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:5173').replace(/\/$/, '');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@dealnear.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'local-admin-password';
const PROJECTION_WAIT_MS = Number(process.env.PROJECTION_WAIT_MS ?? 30000);
const run = Date.now().toString(36);
const location = { latitude: 40.7128 + Math.random() / 100, longitude: -74.006 };

let step = 0;
function ok(message) { console.log(`  ✓ ${++step}. ${message}`); }
function fail(message) { throw new Error(`Step ${step + 1} failed: ${message}`); }

async function call(method, path, { token, body, expect = [200] } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : null;
  if (!expect.includes(response.status)) {
    fail(`${method} ${path} returned ${response.status}: ${text.slice(0, 300)}`);
  }
  return json;
}

async function eventually(description, check) {
  const deadline = Date.now() + PROJECTION_WAIT_MS;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  fail(`timed out waiting for ${description}`);
}

const nearby = (category) => call('GET',
  `/api/discovery/offers?latitude=${location.latitude}&longitude=${location.longitude}&radiusKm=1&category=${category}`);

console.log(`DealNear smoke test against ${BASE_URL}`);

const vendor = await call('POST', '/api/auth/register/vendor', {
  body: { email: `smoke-vendor-${run}@example.com`, password: 'smoke-password-123' }, expect: [201] });
if (!vendor.expiresAt) fail('token response has no expiresAt');
ok('vendor registered and received an expiring token');

const store = await call('POST', '/api/vendors/stores', { token: vendor.accessToken, expect: [201],
  body: { name: `Smoke Store ${run}`, address: '1 Test St', city: 'Smoke City', ...location } });
if (store.verificationStatus !== 'PENDING') fail(`store status ${store.verificationStatus}`);
ok('store created and awaiting verification');

const offer = await call('POST', '/api/offers', { token: vendor.accessToken, expect: [201], body: {
  storeId: store.id, title: `Smoke offer ${run}`, description: 'Created by the smoke test',
  category: 'GROCERY', startAt: new Date(Date.now() - 60000).toISOString(),
  endAt: new Date(Date.now() + 86400000).toISOString() } });
ok('draft offer created with a category');

const refused = await call('POST', `/api/offers/${offer.id}/publish`, { token: vendor.accessToken, expect: [409] });
if (refused.error?.code !== 'STORE_NOT_VERIFIED') fail(`expected STORE_NOT_VERIFIED, got ${refused.error?.code}`);
ok('publishing is refused until the store is verified');

const admin = await call('POST', '/api/auth/login', { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
if (admin.role !== 'ADMIN') fail('admin login did not return ADMIN role');
const pending = await call('GET', '/api/vendors/admin/stores?status=PENDING&size=50', { token: admin.accessToken });
if (!pending.stores.some((s) => s.id === store.id)) fail('store missing from admin review queue');
await call('POST', `/api/vendors/admin/stores/${store.id}/verify`, { token: admin.accessToken });
ok('admin found the store in the review queue and verified it');

await call('POST', `/api/offers/${offer.id}/publish`, { token: vendor.accessToken });
await eventually('the offer to appear in nearby discovery', async () =>
  (await nearby('GROCERY')).offers.some((o) => o.id === offer.id));
const otherCategory = await nearby('FASHION');
if (otherCategory.offers.some((o) => o.id === offer.id)) fail('category filter returned the wrong category');
ok('published offer is discoverable nearby and respects the category filter');

await call('POST', `/api/offers/${offer.id}/pause`, { token: vendor.accessToken });
await call('GET', `/api/offers/public/${offer.id}`, { expect: [404] });
await call('POST', `/api/offers/${offer.id}/resume`, { token: vendor.accessToken });
const detail = await call('GET', `/api/offers/public/${offer.id}`);
const storeOffers = await call('GET', `/api/offers/public?storeId=${store.id}`);
if (detail.storeName !== store.name || !storeOffers.offers.some((o) => o.id === offer.id)) fail('detail view data mismatch');
ok('pause hides the offer, resume restores it, detail and store listing work');

const customer = await call('POST', '/api/auth/register', {
  body: { email: `smoke-customer-${run}@example.com`, password: 'smoke-password-123' }, expect: [201] });
await call('POST', `/api/auth/saved-offers/${offer.id}`, { token: customer.accessToken });
const saved = await call('GET', '/api/auth/saved-offers', { token: customer.accessToken });
if (!saved.savedOffers.some((s) => s.offerId === offer.id)) fail('saved offer missing');
await call('POST', `/api/offers/${offer.id}/reports`, { token: customer.accessToken, expect: [201],
  body: { reason: 'MISLEADING', details: 'smoke test report' } });
ok('customer saved and reported the offer');

const reports = await call('GET', '/api/offers/admin/reports?status=OPEN&size=50', { token: admin.accessToken });
if (!reports.reports.some((r) => r.offerId === offer.id)) fail('report missing from moderation queue');
const removed = await call('POST', `/api/offers/admin/offers/${offer.id}/remove`, {
  token: admin.accessToken, body: { reason: 'Smoke test cleanup' } });
if (removed.status !== 'REMOVED') fail(`offer status ${removed.status}`);
await eventually('the removed offer to leave discovery', async () =>
  !(await nearby('GROCERY')).offers.some((o) => o.id === offer.id));
ok('admin moderation removed the offer from public views and discovery');

console.log(`All ${step} smoke checks passed.`);
