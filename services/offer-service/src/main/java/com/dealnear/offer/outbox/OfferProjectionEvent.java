package com.dealnear.offer.outbox;

import com.dealnear.offer.offer.Offer;
import java.time.Instant;
import java.util.UUID;

public record OfferProjectionEvent(
        UUID offerId,
        UUID storeId,
        String title,
        String description,
        Instant startAt,
        Instant endAt,
        Instant createdAt,
        Instant projectionVersion,
        String category
) {
    public static OfferProjectionEvent from(Offer offer, Instant projectionVersion) {
        return new OfferProjectionEvent(
                offer.getId(), offer.getStoreId(), offer.getTitle(), offer.getDescription(),
                offer.getStartAt(), offer.getEndAt(), offer.getCreatedAt(), projectionVersion,
                offer.getCategory().name()
        );
    }
}
