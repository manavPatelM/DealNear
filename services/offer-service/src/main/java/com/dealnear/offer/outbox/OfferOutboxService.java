package com.dealnear.offer.outbox;

import com.dealnear.offer.offer.Offer;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

@Service
public class OfferOutboxService {
    private final OfferOutboxRepository repository;
    private final ObjectMapper objectMapper;

    public OfferOutboxService(OfferOutboxRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    public void recordProjection(Offer offer) {
        record(offer, "offer.projection.updated.v1",
                OfferProjectionEvent.from(offer, java.time.Instant.now()));
    }

    public void recordRemoval(Offer offer) {
        record(offer, "offer.projection.removed.v1",
                new OfferProjectionRemovalEvent(offer.getId(), java.time.Instant.now()));
    }

    private void record(Offer offer, String eventType, Object event) {
        try {
            java.time.Instant version = java.time.Instant.now();
            repository.save(new OfferOutboxEvent(
                    offer.getId(), eventType,
                    objectMapper.writeValueAsString(event),
                    version
            ));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Could not serialize offer projection event", exception);
        }
    }
}
