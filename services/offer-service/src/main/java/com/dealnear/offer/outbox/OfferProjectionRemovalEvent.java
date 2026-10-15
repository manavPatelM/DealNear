package com.dealnear.offer.outbox;

import java.time.Instant;
import java.util.UUID;

public record OfferProjectionRemovalEvent(UUID offerId, Instant projectionVersion) {
}
