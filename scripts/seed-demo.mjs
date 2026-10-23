#!/usr/bin/env node
// Seeds clearly fictional demo data through the public API (no direct database access):
// demo vendors, verified stores around Ahmedabad, published offers, and demo customers.
//
//   BASE_URL=http://localhost:5173 ADMIN_EMAIL=admin@dealnear.local ADMIN_PASSWORD=... node scripts/seed-demo.mjs
//
// Safe to re-run: existing demo accounts are signed in, existing stores (by name) and
// offers (by title) are reused. All businesses are invented; descriptions say "Demo listing".

const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:5173').replace(/\/$/, '');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@dealnear.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'local-admin-password';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'DemoPass#2026';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

// Fictional businesses. Coordinates are real Ahmedabad neighbourhoods so radius search works.
const VENDORS = [
  {
    email: 'cafe.owner@demo.dealnear.local',
    stores: [
      { name: 'Saffron Spoon Café', address: '12 Demo Lane, Navrangpura', city: 'Ahmedabad', latitude: 23.0365, longitude: 72.5611,
        offers: [
          { title: '20% off your food bill', category: 'CAFES', ends: 3 * HOUR, description: 'Dine-in only, valid on the full menu except beverages. Demo listing.' },
          { title: 'Buy 1 get 1 on cold coffee', category: 'CAFES', ends: 5 * DAY, description: 'Applies to regular-size cold coffees, weekdays 3–6 PM. Demo listing.' },
        ] },
      { name: 'Crumb & Crust Bakery', address: '4 Sample Road, Vastrapur', city: 'Ahmedabad', latitude: 23.0390, longitude: 72.5290,
        offers: [
          { title: 'End-of-day 40% off fresh bakes', category: 'BAKERIES', ends: 6 * HOUR, description: 'All breads and pastries after 8 PM while stock lasts. Demo listing.' },
          { title: 'Free cupcake with any cake order', category: 'BAKERIES', ends: 10 * DAY, description: 'One free cupcake per cake ordered, pickup only. Demo listing.' },
        ] },
      { name: 'Spice Route Kitchen', address: '88 Example Street, Prahlad Nagar', city: 'Ahmedabad', latitude: 23.0120, longitude: 72.5100,
        offers: [
          { title: 'Thali for two at ₹499', category: 'RESTAURANTS', ends: 7 * DAY, description: 'Unlimited Gujarati thali for two, lunch only. Demo listing.' },
        ] },
    ],
  },
  {
    email: 'retail.owner@demo.dealnear.local',
    stores: [
      { name: 'Kite & Thread Boutique', address: '21 Demo Plaza, C.G. Road', city: 'Ahmedabad', latitude: 23.0280, longitude: 72.5600,
        offers: [
          { title: 'Flat 30% off festive kurtas', category: 'CLOTHING', ends: 14 * DAY, description: 'On the new festive collection. Exchanges only, no refunds. Demo listing.' },
          { title: 'Weekend sale: 2 tops for ₹999', category: 'FASHION', ends: 2 * DAY, description: 'Mix and match from the marked rack. Demo listing.' },
        ] },
      { name: 'Stride Sneaker Store', address: '7 Sample Mall, S.G. Highway', city: 'Ahmedabad', latitude: 23.0350, longitude: 72.5070,
        offers: [
          { title: '25% off running shoes', category: 'SHOES_ACCESSORIES', ends: 9 * DAY, description: 'Selected running models, sizes subject to availability. Demo listing.' },
        ] },
      { name: 'Volt Gadget Hub', address: '3 Example Arcade, Satellite', city: 'Ahmedabad', latitude: 23.0300, longitude: 72.5170,
        offers: [
          { title: '₹2,000 off on noise-cancelling headphones', category: 'ELECTRONICS', ends: 12 * DAY, description: 'On selected models above ₹8,000. Demo listing.' },
          { title: 'Free screen guard with any phone case', category: 'ELECTRONICS', ends: 20 * HOUR, description: 'Tempered-glass guard fitted in store. Demo listing.' },
        ] },
      { name: 'Bloom Home Décor', address: '55 Demo Road, Bodakdev', city: 'Ahmedabad', latitude: 23.0400, longitude: 72.5050,
        offers: [
          { title: 'Up to 35% off cushions and throws', category: 'HOME_AND_GARDEN', ends: 6 * DAY, description: 'Discount varies by item; marked prices in store. Demo listing.' },
        ] },
    ],
  },
  {
    email: 'services.owner@demo.dealnear.local',
    stores: [
      { name: 'Glow Herbal Studio', address: '9 Sample Complex, Thaltej', city: 'Ahmedabad', latitude: 23.0500, longitude: 72.5150,
        offers: [
          { title: 'Facial + head massage combo at ₹799', category: 'SALONS_SPAS', ends: 8 * DAY, description: 'By appointment, Monday to Thursday. Demo listing.' },
          { title: '15% off herbal skincare kits', category: 'HEALTH_AND_BEAUTY', ends: 4 * DAY, description: 'On boxed kits only. Demo listing.' },
        ] },
      { name: 'FlexFit Gym', address: '30 Example Tower, Gota', city: 'Ahmedabad', latitude: 23.1000, longitude: 72.5400,
        offers: [
          { title: 'First month membership at ₹999', category: 'FITNESS_SPORTS', ends: 15 * DAY, description: 'New members only, includes one trainer session. Demo listing.' },
        ] },
      { name: 'PageTurner Books', address: '2 Demo Market, near Nirma University', city: 'Ahmedabad', latitude: 23.1290, longitude: 72.5440,
        offers: [
          { title: '10% student discount on all books', category: 'BOOKS_STATIONERY', ends: 30 * DAY, description: 'Show a valid student ID at checkout. Demo listing.' },
          { title: 'Stationery bundle at ₹199', category: 'BOOKS_STATIONERY', ends: 3 * DAY, description: 'Notebooks, pens and highlighters. Demo listing.' },
        ] },
      { name: 'FreshCart Mart', address: '18 Sample Street, Maninagar', city: 'Ahmedabad', latitude: 22.9960, longitude: 72.6030,
        offers: [
          { title: '₹100 off on groceries above ₹999', category: 'GROCERY', ends: 5 * DAY, description: 'One use per bill. Demo listing.' },
        ] },
    ],
  },
];

const CUSTOMERS = ['priya.customer@demo.dealnear.local', 'rahul.customer@demo.dealnear.local'];

async function call(method, path, { token, body, ok = [200, 201] } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : null;
  if (!ok.includes(response.status)) {
    throw new Error(`${method} ${path} -> ${response.status} ${text.slice(0, 200)}`);
  }
  return { status: response.status, json };
}

async function account(email, registerPath) {
  const created = await call('POST', registerPath, { body: { email, password: DEMO_PASSWORD }, ok: [201, 409] });
  if (created.status === 201) return created.json.accessToken;
  return (await call('POST', '/api/auth/login', { body: { email, password: DEMO_PASSWORD } })).json.accessToken;
}

const admin = (await call('POST', '/api/auth/login', { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } })).json.accessToken;
console.log(`Seeding demo data at ${BASE_URL}`);
const publishedIds = [];

for (const vendor of VENDORS) {
  const token = await account(vendor.email, '/api/auth/register/vendor');
  const existingStores = (await call('GET', '/api/vendors/stores?size=50', { token })).json.stores;
  const existingOffers = (await call('GET', '/api/offers?size=50', { token })).json.offers;

  for (const spec of vendor.stores) {
    const { offers, ...storeBody } = spec;
    let store = existingStores.find((s) => s.name === spec.name);
    if (!store) store = (await call('POST', '/api/vendors/stores', { token, body: storeBody })).json;
    if (store.verificationStatus !== 'VERIFIED') {
      await call('POST', `/api/vendors/admin/stores/${store.id}/verify`, { token: admin, ok: [200, 409] });
    }

    for (const offerSpec of offers) {
      let offer = existingOffers.find((o) => o.title === offerSpec.title && o.storeId === store.id);
      if (!offer) {
        offer = (await call('POST', '/api/offers', {
          token,
          body: {
            storeId: store.id, title: offerSpec.title, description: offerSpec.description, category: offerSpec.category,
            startAt: new Date(Date.now() - HOUR).toISOString(), endAt: new Date(Date.now() + offerSpec.ends).toISOString(),
          },
        })).json;
      }
      if (offer.status === 'DRAFT') {
        offer = (await call('POST', `/api/offers/${offer.id}/publish`, { token })).json;
      }
      if (offer.status === 'PUBLISHED') publishedIds.push(offer.id);
    }
    console.log(`  ✓ ${spec.name} (${offers.length} offers)`);
  }
}

for (const [i, email] of CUSTOMERS.entries()) {
  const token = await account(email, '/api/auth/register');
  for (const offerId of publishedIds.filter((_, n) => n % CUSTOMERS.length === i).slice(0, 4)) {
    await call('POST', `/api/auth/saved-offers/${offerId}`, { token });
  }
  console.log(`  ✓ customer ${email}`);
}

console.log(`\nDone: ${VENDORS.length} vendors, ${VENDORS.flatMap((v) => v.stores).length} stores, ${publishedIds.length} live offers, ${CUSTOMERS.length} customers.`);
console.log(`Demo password for every demo account: ${DEMO_PASSWORD}`);
console.log('Nearby offers appear in discovery within a few seconds (outbox delivery).');
