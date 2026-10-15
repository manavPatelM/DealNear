package com.dealnear.offer.offer;

import java.util.List;

public record OfferPageResponse(
        List<OfferResponse> offers,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
}
