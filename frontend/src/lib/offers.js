// Offer vocabulary shared by the customer, vendor, and admin views. Values match offer-service.

export const CATEGORIES = [
  { value: 'FOOD_AND_DRINK', label: 'Food & drink' },
  { value: 'GROCERY', label: 'Grocery' },
  { value: 'FASHION', label: 'Fashion' },
  { value: 'ELECTRONICS', label: 'Electronics' },
  { value: 'HEALTH_AND_BEAUTY', label: 'Health & beauty' },
  { value: 'HOME_AND_GARDEN', label: 'Home & garden' },
  { value: 'SERVICES', label: 'Services' },
  { value: 'ENTERTAINMENT', label: 'Entertainment' },
  { value: 'OTHER', label: 'Other' },
];

export function categoryLabel(value) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? 'Other';
}

export const REPORT_REASONS = [
  { value: 'MISLEADING', label: 'Misleading or incorrect' },
  { value: 'UNAVAILABLE', label: 'Not honoured / unavailable' },
  { value: 'INAPPROPRIATE', label: 'Inappropriate content' },
  { value: 'SPAM', label: 'Spam' },
  { value: 'OTHER', label: 'Something else' },
];

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
