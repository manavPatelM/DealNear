// Offer vocabulary shared by the customer, vendor, and admin views.
// Categories come from GET /api/categories (admin-managed); helpers take that list as input.

export const REPORT_REASONS = [
  { value: 'MISLEADING', label: 'Misleading or incorrect' },
  { value: 'UNAVAILABLE', label: 'Not honoured / unavailable' },
  { value: 'INAPPROPRIATE', label: 'Inappropriate content' },
  { value: 'SPAM', label: 'Spam' },
  { value: 'OTHER', label: 'Something else' },
];

export function findCategory(categories, code) {
  return (categories ?? []).find((c) => c.code === code) ?? null;
}

export function categoryLabel(categories, code) {
  return findCategory(categories, code)?.name ?? 'Other';
}

/** Top-level categories with their subcategories, in display order. */
export function groupCategories(categories) {
  const list = categories ?? [];
  return list
    .filter((c) => !c.parentCode)
    .map((parent) => ({ ...parent, children: list.filter((c) => c.parentCode === parent.code) }));
}

/** A category's code plus its subcategory codes, for discovery filters. */
export function categoryCodesWithChildren(categories, code) {
  if (!code) return [];
  return [code, ...(categories ?? []).filter((c) => c.parentCode === code).map((c) => c.code)];
}

/** Status the vendor should see; a published offer past its end date reads as expired. */
export function displayStatus(offer) {
  if (offer.status === 'PUBLISHED' && offer.expired) return 'EXPIRED';
  return offer.status;
}

/** Lifecycle actions offer-service accepts for an offer in its current state. */
export function vendorActions(offer) {
  switch (displayStatus(offer)) {
    case 'DRAFT': return ['edit', 'publish', 'expire', 'delete'];
    case 'PUBLISHED': return ['edit', 'pause', 'unpublish', 'expire', 'delete'];
    case 'PAUSED': return ['edit', 'resume', 'unpublish', 'expire', 'delete'];
    case 'EXPIRED': return offer.status === 'PUBLISHED' ? ['expire', 'delete'] : ['delete'];
    case 'REMOVED': return ['delete'];
    default: return ['delete'];
  }
}

export function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : '?';
}

/** Human time left until an ISO instant, based on the real expiry (no fake countdowns). */
export function timeLeft(endAt, nowMs = Date.now()) {
  const ms = new Date(endAt).getTime() - nowMs;
  if (!Number.isFinite(ms)) return null;
  if (ms <= 0) return 'Expired';
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return `Ends in ${Math.max(1, Math.floor(ms / 60_000))} min`;
  if (hours < 24) return `Ends in ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Ends tomorrow' : `Ends in ${days} days`;
}
