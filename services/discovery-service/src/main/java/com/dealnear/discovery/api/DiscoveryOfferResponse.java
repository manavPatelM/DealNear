package com.dealnear.discovery.api;

import java.time.Instant;
import java.util.UUID;

public record DiscoveryOfferResponse(
        UUID id,
        UUID storeId,
        String storeName,
        String storeCity,
        String title,
        String description,
        double distanceKm,
        String category,
        Instant startAt,
        Instant endAt
) {
}
