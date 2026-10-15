import assert from 'node:assert/strict';
import test from 'node:test';

import { authFromToken, isTokenExpired, loadAuth, parseToken, TOKEN_KEY } from './auth.js';

function tokenWith(payload) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256' })}.${encode(payload)}.signature`;
}

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
    has: (key) => data.has(key),
  };
}

test('parseToken decodes unpadded base64url payloads', () => {
  assert.deepEqual(parseToken(tokenWith({ sub: 'u-1', role: 'ADMIN', exp: 10 })), { sub: 'u-1', role: 'ADMIN', exp: 10 });
  assert.equal(parseToken('not-a-token'), null);
});

test('tokens without a future numeric exp are expired', () => {
  const now = 1_000_000;
  assert.equal(isTokenExpired({ exp: 1001 }, now), false);
  assert.equal(isTokenExpired({ exp: 1000 }, now), true);
  assert.equal(isTokenExpired({}, now), true);
  assert.equal(isTokenExpired({ exp: '9999999999' }, now), true);
});

test('authFromToken exposes role and subject for valid tokens only', () => {
  const token = tokenWith({ sub: 'u-1', role: 'VENDOR', exp: 2000 });
  assert.deepEqual(authFromToken(token, 1_000_000), { token, role: 'VENDOR', userId: 'u-1' });
  assert.equal(authFromToken(token, 3_000_000).token, null);
});

test('loadAuth discards an expired stored token', () => {
  const storage = memoryStorage({ [TOKEN_KEY]: tokenWith({ sub: 'u-1', role: 'CUSTOMER', exp: 1 }) });
  assert.equal(loadAuth(storage).token, null);
  assert.equal(storage.has(TOKEN_KEY), false);
});
