package com.dealnear.offer.offer;

import java.time.Instant;
import java.util.Collection;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

/** Composable filters for the public, customer-facing offer listing. */
final class PublicOfferSpecifications {
    private PublicOfferSpecifications() {
    }

    /** Published offers whose validity window has not ended, matching the existing query-time expiry rule. */
    static Specification<Offer> active() {
        return (root, query, cb) -> cb.and(
                cb.equal(root.get("status"), Offer.Status.PUBLISHED),
                cb.greaterThan(root.<Instant>get("endAt"), Instant.now())
        );
    }

    static Specification<Offer> inCategory(OfferCategory category) {
        return category == null ? null : (root, query, cb) -> cb.equal(root.get("category"), category);
    }

    static Specification<Offer> atStore(UUID storeId) {
        return storeId == null ? null : (root, query, cb) -> cb.equal(root.get("storeId"), storeId);
    }

    static Specification<Offer> withIds(Collection<UUID> ids) {
        return ids == null || ids.isEmpty() ? null : (root, query, cb) -> root.get("id").in(ids);
    }
}
