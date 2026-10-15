package com.dealnear.discovery.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

public record ProjectionStoreRequest(
        @NotNull UUID storeId,
        @NotBlank String storeName,
        @NotBlank String storeCity,
        double latitude,
        double longitude,
        @NotNull Instant projectionVersion,
        Boolean storeActive
) {
    /** Producers that predate store verification omit the flag; their stores were all eligible. */
    boolean storeActiveOrDefault() {
        return storeActive == null || storeActive;
    }
}
