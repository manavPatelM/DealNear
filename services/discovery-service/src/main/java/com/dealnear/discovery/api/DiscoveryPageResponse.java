package com.dealnear.discovery.api;

import java.util.List;

public record DiscoveryPageResponse(
        List<DiscoveryOfferResponse> offers,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
}
