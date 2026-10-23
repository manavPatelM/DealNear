package com.dealnear.offer.offer;

import com.dealnear.offer.ownership.StoreSummary;
import java.time.Instant;
import java.util.UUID;

public record PublicOfferResponse(
        UUID id,
        UUID storeId,
        String storeName,
        String storeCity,
        String title,
        String description,
        String status,
        Instant createdAt,
        Instant startAt,
        Instant endAt,
        String category
) {
    public static PublicOfferResponse from(Offer offer, StoreSummary store) {
        return new PublicOfferResponse(
                offer.getId(),
                offer.getStoreId(),
                store.name(),
                store.city(),
                offer.getTitle(),
                offer.getDescription(),
                offer.getStatus().name(),
                offer.getCreatedAt(),
                offer.getStartAt(),
                offer.getEndAt(),
                offer.getCategory()
        );
    }
}
