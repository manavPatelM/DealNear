package com.dealnear.vendor.store;

import java.util.UUID;

public record StoreProjectionDetails(
        UUID id,
        String name,
        String city,
        double latitude,
        double longitude
) {
    static StoreProjectionDetails from(Store store) {
        return new StoreProjectionDetails(
                store.getId(), store.getName(), store.getCity(),
                store.getLatitude(), store.getLongitude()
        );
    }
}
