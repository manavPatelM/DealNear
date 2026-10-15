package com.dealnear.offer.offer;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateOfferRequest(
        @NotBlank @Size(max = 255) String title,
        @NotBlank @Size(max = 2000) String description,
        OfferCategory category
) {
}
