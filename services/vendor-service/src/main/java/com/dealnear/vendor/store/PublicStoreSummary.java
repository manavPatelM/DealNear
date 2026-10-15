package com.dealnear.vendor.store;

import java.util.UUID;

public record PublicStoreSummary(
        UUID id,
        String name,
        String city
) {
    public static PublicStoreSummary from(Store store) {
        return new PublicStoreSummary(store.getId(), store.getName(), store.getCity());
    }
}
