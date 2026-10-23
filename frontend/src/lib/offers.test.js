import assert from 'node:assert/strict';
import test from 'node:test';

import {
  categoryCodesWithChildren, categoryLabel, displayStatus, groupCategories, timeLeft, vendorActions,
} from './offers.js';

const categories = [
  { code: 'FOOD_AND_DRINK', name: 'Food & Cafés', parentCode: null },
  { code: 'CAFES', name: 'Cafés', parentCode: 'FOOD_AND_DRINK' },
  { code: 'FASHION', name: 'Fashion', parentCode: null },
];

test('category labels come from the API list and fall back to Other', () => {
  assert.equal(categoryLabel(categories, 'CAFES'), 'Cafés');
  assert.equal(categoryLabel(categories, 'UNKNOWN'), 'Other');
  assert.equal(categoryLabel(undefined, 'CAFES'), 'Other');
});

test('categories group into parents with children', () => {
  const grouped = groupCategories(categories);
  assert.deepEqual(grouped.map((c) => c.code), ['FOOD_AND_DRINK', 'FASHION']);
  assert.deepEqual(grouped[0].children.map((c) => c.code), ['CAFES']);
});

test('a parent filter includes its subcategory codes', () => {
  assert.deepEqual(categoryCodesWithChildren(categories, 'FOOD_AND_DRINK'), ['FOOD_AND_DRINK', 'CAFES']);
  assert.deepEqual(categoryCodesWithChildren(categories, 'CAFES'), ['CAFES']);
  assert.deepEqual(categoryCodesWithChildren(categories, ''), []);
});

test('published offers past their end date display as expired', () => {
  assert.equal(displayStatus({ status: 'PUBLISHED', expired: true }), 'EXPIRED');
  assert.equal(displayStatus({ status: 'PAUSED', expired: false }), 'PAUSED');
});

test('vendor actions follow the offer-service lifecycle', () => {
  assert.deepEqual(vendorActions({ status: 'DRAFT' }), ['edit', 'publish', 'expire', 'delete']);
  assert.ok(vendorActions({ status: 'PUBLISHED' }).includes('pause'));
  assert.ok(vendorActions({ status: 'PAUSED' }).includes('resume'));
  assert.deepEqual(vendorActions({ status: 'REMOVED' }), ['delete']);
  assert.deepEqual(vendorActions({ status: 'EXPIRED' }), ['delete']);
});

test('time left reflects the real expiry', () => {
  const now = Date.parse('2026-10-22T10:00:00Z');
  assert.equal(timeLeft('2026-10-22T10:30:00Z', now), 'Ends in 30 min');
  assert.equal(timeLeft('2026-10-22T15:00:00Z', now), 'Ends in 5 h');
  assert.equal(timeLeft('2026-10-23T12:00:00Z', now), 'Ends tomorrow');
  assert.equal(timeLeft('2026-10-26T10:00:00Z', now), 'Ends in 4 days');
  assert.equal(timeLeft('2026-10-22T09:00:00Z', now), 'Expired');
});
