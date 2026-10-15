package com.dealnear.offer.outbox;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

@Component
public class OfferProjectionMetrics {
    private final Counter successfulDeliveries;
    private final Counter failedDeliveries;
    private final Timer deliveryDuration;

    public OfferProjectionMetrics(MeterRegistry meterRegistry) {
        successfulDeliveries = Counter.builder("dealnear.offer.projection.delivery")
                .description("Projection delivery outcomes")
                .tag("result", "success")
                .register(meterRegistry);
        failedDeliveries = Counter.builder("dealnear.offer.projection.delivery")
                .description("Projection delivery outcomes")
                .tag("result", "failure")
                .register(meterRegistry);
        deliveryDuration = Timer.builder("dealnear.offer.projection.delivery.duration")
                .description("Time spent delivering one offer projection")
                .register(meterRegistry);
    }

    public Timer.Sample startDelivery() {
        return Timer.start();
    }

    public void recordSuccess(Timer.Sample sample) {
        successfulDeliveries.increment();
        sample.stop(deliveryDuration);
    }

    public void recordFailure(Timer.Sample sample) {
        failedDeliveries.increment();
        sample.stop(deliveryDuration);
    }
}
