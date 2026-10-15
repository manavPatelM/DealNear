package com.dealnear.vendor.store;

import java.time.Instant;
import java.util.UUID;

public record StoreResponse(
        UUID id,
        String vendorId,
        String name,
        String address,
        String city,
        double latitude,
        double longitude,
        Instant createdAt,
        String verificationStatus,
        String verificationNote,
        Instant reviewedAt
) {
    public static StoreResponse from(Store store) {
        return new StoreResponse(
                store.getId(),
                store.getVendorId(),
                store.getName(),
                store.getAddress(),
                store.getCity(),
                store.getLatitude(),
                store.getLongitude(),
                store.getCreatedAt(),
                store.getVerificationStatus().name(),
                store.getVerificationNote(),
                store.getReviewedAt()
        );
    }
}
