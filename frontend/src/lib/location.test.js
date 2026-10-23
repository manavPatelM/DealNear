import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cityLocation, deviceLocation, discoveryParams, formatDistance, isValidLocation, loadLocation, LOCATION_KEY, saveLocation,
} from './location.js';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
}

test('city and device locations are valid with a supported radius', () => {
  assert.ok(isValidLocation(cityLocation('ahmedabad', 10)));
  assert.equal(cityLocation('atlantis'), null);
  const device = deviceLocation(23.123456789, 72.5, 2);
  assert.equal(device.latitude, 23.12346);
  assert.ok(isValidLocation(device));
  assert.equal(isValidLocation({ ...device, radiusKm: 7 }), false);
});

test('stored locations round-trip and invalid data is ignored', () => {
  const storage = memoryStorage();
  saveLocation(cityLocation('pune', 25), storage);
  assert.equal(loadLocation(storage).label, 'Pune');
  assert.equal(loadLocation(memoryStorage({ [LOCATION_KEY]: '{"latitude":999}' })), null);
  assert.equal(loadLocation(memoryStorage({ [LOCATION_KEY]: 'not json' })), null);
  saveLocation(null, storage);
  assert.equal(loadLocation(storage), null);
});

test('distance formatting and discovery parameters', () => {
  assert.equal(formatDistance(0.42), '420 m away');
  assert.equal(formatDistance(3.456), '3.5 km away');
  assert.equal(formatDistance(undefined), null);
  const params = discoveryParams(cityLocation('surat', 5), { category: 'GROCERY', page: 0, empty: '' });
  assert.equal(params.get('radiusKm'), '5');
  assert.equal(params.get('category'), 'GROCERY');
  assert.equal(params.get('page'), '0');
  assert.equal(params.has('empty'), false);
});
