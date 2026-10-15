package com.dealnear.discovery.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ProjectionOfferRemovalRequestTest {
    @Test
    void carriesOfferIdentityAndVersion() {
        UUID offerId = UUID.randomUUID();
        Instant version = Instant.parse("2026-10-13T00:00:00Z");

        ProjectionOfferRemovalRequest request = new ProjectionOfferRemovalRequest(offerId, version);

        assertThat(request.offerId()).isEqualTo(offerId);
        assertThat(request.projectionVersion()).isEqualTo(version);
    }
}
