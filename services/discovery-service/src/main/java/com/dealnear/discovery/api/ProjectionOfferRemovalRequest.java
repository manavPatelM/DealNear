package com.dealnear.discovery.api;

import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

public record ProjectionOfferRemovalRequest(
        @NotNull UUID offerId,
        @NotNull Instant projectionVersion
) {
}
