package com.dealnear.offer.offer;

import java.util.List;

public record PublicOfferPageResponse(
        List<PublicOfferResponse> offers,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
}
