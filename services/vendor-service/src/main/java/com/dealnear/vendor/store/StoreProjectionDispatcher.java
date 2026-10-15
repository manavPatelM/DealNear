package com.dealnear.vendor.store;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

@Component
@ConditionalOnProperty(name = "dealnear.store-projection-dispatcher.enabled", havingValue = "true")
public class StoreProjectionDispatcher {
    private static final Logger LOGGER = LoggerFactory.getLogger(StoreProjectionDispatcher.class);
    private final StoreProjectionOutboxRepository repository;
    private final RestClient discoveryClient;
    private final String projectionToken;
    private final ObjectMapper objectMapper;

    public StoreProjectionDispatcher(
            StoreProjectionOutboxRepository repository,
            @Value("${dealnear.discovery-service-url}") String discoveryServiceUrl,
            @Value("${dealnear.projection-token}") String projectionToken,
            @Value("${dealnear.store-projection-dispatcher.timeout-ms:2000}") int timeoutMs,
            ObjectMapper objectMapper
    ) {
        this.repository = repository;
        this.discoveryClient = RestClient.builder()
                .baseUrl(discoveryServiceUrl)
                .requestFactory(clientFactory(timeoutMs))
                .build();
        this.projectionToken = projectionToken;
        this.objectMapper = objectMapper;
    }

    @Scheduled(fixedDelayString = "${dealnear.store-projection-dispatcher.interval-ms:5000}")
    @Transactional
    public void dispatchPending() {
        for (StoreProjectionOutboxEvent event : repository.findPending()) {
            try {
                StoreProjectionOutboxService.StoreProjectionUpdate update =
                        objectMapper.readValue(
                                event.getPayload(),
                                StoreProjectionOutboxService.StoreProjectionUpdate.class
                        );
                discoveryClient.post()
                        .uri("/api/discovery/projections/stores")
                        .header("X-Projection-Token", projectionToken)
                        .body(update)
                        .retrieve()
                        .toBodilessEntity();
                event.markPublished(Instant.now());
                repository.save(event);
            } catch (Exception exception) {
                LOGGER.warn("Store projection delivery failed for outbox event {}", event.getId());
            }
        }
    }

    private SimpleClientHttpRequestFactory clientFactory(int timeoutMs) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(timeoutMs));
        factory.setReadTimeout(Duration.ofMillis(timeoutMs));
        return factory;
    }
}
