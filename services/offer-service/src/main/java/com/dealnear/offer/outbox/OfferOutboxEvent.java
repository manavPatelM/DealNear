package com.dealnear.offer.outbox;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "offer_outbox")
public class OfferOutboxEvent {
    @Id
    private UUID id;
    @Column(name = "offer_id", nullable = false)
    private UUID offerId;
    @Column(name = "event_type", nullable = false)
    private String eventType;
    @Column(nullable = false, length = 10000)
    private String payload;
    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;
    @Column(name = "published_at")
    private Instant publishedAt;
    @Column(nullable = false)
    private int attempts;
    @Column(name = "next_attempt_at")
    private Instant nextAttemptAt;

    protected OfferOutboxEvent() {
    }

    public OfferOutboxEvent(UUID offerId, String eventType, String payload, Instant occurredAt) {
        this.id = UUID.randomUUID();
        this.offerId = offerId;
        this.eventType = eventType;
        this.payload = payload;
        this.occurredAt = occurredAt;
    }

    public UUID getId() { return id; }
    public UUID getOfferId() { return offerId; }
    public String getEventType() { return eventType; }
    public String getPayload() { return payload; }
    public Instant getOccurredAt() { return occurredAt; }
    public Instant getPublishedAt() { return publishedAt; }
    public int getAttempts() { return attempts; }
    public Instant getNextAttemptAt() { return nextAttemptAt; }

    public void markPublished(Instant now) {
        publishedAt = now;
    }

    public void clearRetrySchedule() {
        nextAttemptAt = null;
    }

    public void recordAttempt(Instant now, long baseDelaySeconds, int maxDelaySeconds) {
        attempts++;
        long multiplier = 1L << Math.min(attempts - 1, 10);
        long delay = Math.min(baseDelaySeconds * multiplier, maxDelaySeconds);
        nextAttemptAt = now.plusSeconds(delay);
    }
}
