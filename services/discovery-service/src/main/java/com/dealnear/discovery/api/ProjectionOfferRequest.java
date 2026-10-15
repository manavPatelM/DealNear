package com.dealnear.discovery.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

public record ProjectionOfferRequest(
        @NotNull UUID offerId,
        @NotNull UUID storeId,
        @NotBlank String storeName,
        @NotBlank String storeCity,
        @NotBlank String title,
        @NotBlank String description,
        @NotNull Instant startAt,
        @NotNull Instant endAt,
        @NotNull Instant createdAt,
        @NotNull Instant projectionVersion,
        @NotNull Double latitude,
        @NotNull Double longitude,
        String category,
        Boolean storeActive
) {
    /** Producers that predate store verification omit the flag; their stores were all eligible. */
    boolean storeActiveOrDefault() {
        return storeActive == null || storeActive;
    }
}
