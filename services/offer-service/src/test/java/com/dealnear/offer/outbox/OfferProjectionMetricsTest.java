package com.dealnear.offer.outbox;

import static org.assertj.core.api.Assertions.assertThat;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;

class OfferProjectionMetricsTest {
    @Test
    void recordsSuccessAndFailureWithStableLowCardinalityTags() {
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        OfferProjectionMetrics metrics = new OfferProjectionMetrics(registry);

        var success = metrics.startDelivery();
        metrics.recordSuccess(success);
        var failure = metrics.startDelivery();
        metrics.recordFailure(failure);

        assertThat(registry.get("dealnear.offer.projection.delivery")
                .tag("result", "success")
                .counter()
                .count()).isEqualTo(1);
        assertThat(registry.get("dealnear.offer.projection.delivery")
                .tag("result", "failure")
                .counter()
                .count()).isEqualTo(1);
        assertThat(registry.get("dealnear.offer.projection.delivery.duration")
                .timer()
                .count()).isEqualTo(2);
    }
}
