package com.dealnear.offer.offer;

import java.time.Instant;
import java.util.UUID;

public record OfferResponse(
        UUID id,
        String vendorId,
        UUID storeId,
        String title,
        String description,
        String status,
        Instant createdAt,
        Instant startAt,
        Instant endAt
) {
    public static OfferResponse from(Offer offer) {
        return new OfferResponse(offer.getId(), offer.getVendorId(), offer.getStoreId(),
                offer.getTitle(), offer.getDescription(), offer.getStatus().name(), offer.getCreatedAt(),
                offer.getStartAt(), offer.getEndAt());
    }
}
