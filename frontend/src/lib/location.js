// Customer location preference: chosen city or device position, plus search radius.
// Pure helpers so they can be unit tested with `node --test`.

export const LOCATION_KEY = 'dealnear.location';
export const RADIUS_OPTIONS = [2, 5, 10, 25];
export const DEFAULT_RADIUS_KM = 5;

// Supported cities for manual selection until area/postal-code search lands (DN-053).
export const CITIES = [
  { id: 'ahmedabad', name: 'Ahmedabad', latitude: 23.0225, longitude: 72.5714 },
  { id: 'gandhinagar', name: 'Gandhinagar', latitude: 23.2156, longitude: 72.6369 },
  { id: 'vadodara', name: 'Vadodara', latitude: 22.3072, longitude: 73.1812 },
  { id: 'surat', name: 'Surat', latitude: 21.1702, longitude: 72.8311 },
  { id: 'mumbai', name: 'Mumbai', latitude: 19.076, longitude: 72.8777 },
  { id: 'pune', name: 'Pune', latitude: 18.5204, longitude: 73.8567 },
  { id: 'delhi', name: 'New Delhi', latitude: 28.6139, longitude: 77.209 },
  { id: 'jaipur', name: 'Jaipur', latitude: 26.9124, longitude: 75.7873 },
  { id: 'bengaluru', name: 'Bengaluru', latitude: 12.9716, longitude: 77.5946 },
  { id: 'hyderabad', name: 'Hyderabad', latitude: 17.385, longitude: 78.4867 },
  { id: 'chennai', name: 'Chennai', latitude: 13.0827, longitude: 80.2707 },
  { id: 'kolkata', name: 'Kolkata', latitude: 22.5726, longitude: 88.3639 },
];

export function isValidLocation(value) {
  return Boolean(value)
    && Number.isFinite(value.latitude) && value.latitude >= -90 && value.latitude <= 90
    && Number.isFinite(value.longitude) && value.longitude >= -180 && value.longitude <= 180
    && RADIUS_OPTIONS.includes(value.radiusKm)
    && typeof value.label === 'string' && value.label.length > 0;
}

export function cityLocation(cityId, radiusKm = DEFAULT_RADIUS_KM) {
  const city = CITIES.find((c) => c.id === cityId);
  if (!city) return null;
  return { label: city.name, latitude: city.latitude, longitude: city.longitude, radiusKm, source: 'city' };
}

export function deviceLocation(latitude, longitude, radiusKm = DEFAULT_RADIUS_KM) {
  return {
    label: 'Current location',
    latitude: Number(latitude.toFixed(5)),
    longitude: Number(longitude.toFixed(5)),
    radiusKm,
    source: 'device',
  };
}

export function loadLocation(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(LOCATION_KEY) ?? 'null');
    return isValidLocation(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveLocation(value, storage = globalThis.localStorage) {
  try {
    if (value) storage?.setItem(LOCATION_KEY, JSON.stringify(value));
    else storage?.removeItem(LOCATION_KEY);
  } catch { /* storage unavailable: preference lasts for this page only */ }
}

export function formatDistance(km) {
  if (typeof km !== 'number' || !Number.isFinite(km)) return null;
  return km < 1 ? `${Math.round(km * 1000)} m away` : `${km.toFixed(1)} km away`;
}

/** Query parameters for GET /api/discovery/offers. */
export function discoveryParams(location, extra = {}) {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    radiusKm: String(location.radiusKm),
  });
  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  return params;
}
