package com.dealnear.vendor.store;

import java.util.List;

public record StorePageResponse(
        List<StoreResponse> stores,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
}
