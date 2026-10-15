import assert from 'node:assert/strict';
import test from 'node:test';

import { categoryLabel, displayStatus, vendorActions } from './offers.js';

test('category labels fall back to Other', () => {
  assert.equal(categoryLabel('FOOD_AND_DRINK'), 'Food & drink');
  assert.equal(categoryLabel('UNKNOWN'), 'Other');
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
