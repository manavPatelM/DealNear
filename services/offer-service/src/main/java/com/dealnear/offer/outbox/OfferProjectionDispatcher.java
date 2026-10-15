package com.dealnear.offer.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.Timer;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.HttpMethod;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

@Component
@ConditionalOnProperty(name = "dealnear.projection-dispatcher.enabled", havingValue = "true")
public class OfferProjectionDispatcher {
    private static final Logger LOGGER = LoggerFactory.getLogger(OfferProjectionDispatcher.class);
    private final OfferOutboxRepository repository;
    private final ObjectMapper objectMapper;
    private final RestClient vendorClient;
    private final RestClient discoveryClient;
    private final String vendorProjectionToken;
    private final String discoveryProjectionToken;
    private final long retryBaseDelaySeconds;
    private final int retryMaxDelaySeconds;
    private final OfferProjectionMetrics metrics;

    public OfferProjectionDispatcher(
            OfferOutboxRepository repository,
            ObjectMapper objectMapper,
            @Value("${dealnear.vendor-service-url}") String vendorServiceUrl,
            @Value("${dealnear.discovery-service-url}") String discoveryServiceUrl,
            @Value("${dealnear.vendor-projection-token}") String vendorProjectionToken,
            @Value("${dealnear.discovery-projection-token}") String discoveryProjectionToken,
            @Value("${dealnear.projection-dispatcher.retry-base-delay-seconds:5}") long retryBaseDelaySeconds,
            @Value("${dealnear.projection-dispatcher.retry-max-delay-seconds:300}") int retryMaxDelaySeconds,
            @Value("${dealnear.projection-dispatcher.timeout-ms:2000}")             int timeoutMs,
            OfferProjectionMetrics metrics
    ) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.vendorClient = client(vendorServiceUrl, timeoutMs);
        this.discoveryClient = client(discoveryServiceUrl, timeoutMs);
        this.vendorProjectionToken = vendorProjectionToken;
        this.discoveryProjectionToken = discoveryProjectionToken;
        this.retryBaseDelaySeconds = retryBaseDelaySeconds;
        this.retryMaxDelaySeconds = retryMaxDelaySeconds;
        this.metrics = metrics;
    }

    @Scheduled(fixedDelayString = "${dealnear.projection-dispatcher.interval-ms:5000}")
    @Transactional
    public void dispatchPending() {
        List<OfferOutboxEvent> events = repository.findPending();
        for (OfferOutboxEvent event : events) {
            dispatch(event);
        }
    }

    private void dispatch(OfferOutboxEvent event) {
        Timer.Sample deliveryTimer = metrics.startDelivery();
        try {
            if ("offer.projection.removed.v1".equals(event.getEventType())) {
                OfferProjectionRemovalEvent removal =
                        objectMapper.readValue(event.getPayload(), OfferProjectionRemovalEvent.class);
                discoveryClient.method(HttpMethod.DELETE)
                        .uri("/api/discovery/projections/offers")
                        .header("X-Projection-Token", discoveryProjectionToken)
                        .body(removal)
                        .retrieve()
                        .toBodilessEntity();
            } else {
                OfferProjectionEvent offer = objectMapper.readValue(event.getPayload(), OfferProjectionEvent.class);
                StoreProjectionDetails store = vendorClient.get()
                        .uri("/api/vendors/stores/projection/{storeId}", offer.storeId())
                        .header("X-Projection-Token", vendorProjectionToken)
                        .retrieve()
                        .body(StoreProjectionDetails.class);
                if (store == null) {
                    throw new IllegalStateException("Vendor projection response was empty");
                }
                discoveryClient.post()
                        .uri("/api/discovery/projections/offers")
                        .header("X-Projection-Token", discoveryProjectionToken)
                        .body(new ProjectionRequest(offer, store))
                        .retrieve()
                        .toBodilessEntity();
            }
            event.markPublished(Instant.now());
            event.clearRetrySchedule();
            repository.save(event);
            metrics.recordSuccess(deliveryTimer);
        } catch (Exception exception) {
            event.recordAttempt(Instant.now(), retryBaseDelaySeconds, retryMaxDelaySeconds);
            repository.save(event);
            metrics.recordFailure(deliveryTimer);
            LOGGER.warn("Offer projection delivery failed for outbox event {} on attempt {}",
                    event.getId(), event.getAttempts());
        }
    }

    private RestClient client(String baseUrl, int timeoutMs) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(timeoutMs));
        factory.setReadTimeout(Duration.ofMillis(timeoutMs));
        return RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
    }

    private record StoreProjectionDetails(
            UUID id, String name, String city, double latitude, double longitude, Boolean storeActive
    ) {
    }

    private record ProjectionRequest(
            UUID offerId, UUID storeId, String storeName, String storeCity,
            String title, String description, java.time.Instant startAt,
            java.time.Instant endAt, java.time.Instant createdAt,
            java.time.Instant projectionVersion,
            double latitude, double longitude, String category, Boolean storeActive
    ) {
        ProjectionRequest(OfferProjectionEvent offer, StoreProjectionDetails store) {
            this(offer.offerId(), offer.storeId(), store.name(), store.city(), offer.title(),
                    offer.description(), offer.startAt(), offer.endAt(), offer.createdAt(),
                    offer.projectionVersion(),
                    store.latitude(), store.longitude(), offer.category(), store.storeActive());
        }
    }

    private record OfferProjectionRemovalEvent(UUID offerId, Instant projectionVersion) {
    }
}
