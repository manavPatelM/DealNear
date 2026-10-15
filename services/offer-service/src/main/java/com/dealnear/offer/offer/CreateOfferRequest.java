package com.dealnear.offer.offer;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

public record CreateOfferRequest(
        UUID storeId,
        @NotBlank @Size(max = 255) String title,
        @NotBlank @Size(max = 2000) String description,
        @NotNull Instant startAt,
        @NotNull Instant endAt,
        OfferCategory category
) {
    /** Category is optional for backward compatibility; omitted values default to OTHER. */
    public OfferCategory categoryOrDefault() {
        return category == null ? OfferCategory.OTHER : category;
    }
}
