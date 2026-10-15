package com.dealnear.vendor.store;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "store_projection_outbox")
public class StoreProjectionOutboxEvent {
    @Id
    private UUID id;
    @Column(name = "store_id", nullable = false)
    private UUID storeId;
    @Column(nullable = false, length = 10000)
    private String payload;
    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;
    @Column(name = "published_at")
    private Instant publishedAt;

    protected StoreProjectionOutboxEvent() {
    }

    public StoreProjectionOutboxEvent(UUID storeId, String payload, Instant occurredAt) {
        this.id = UUID.randomUUID();
        this.storeId = storeId;
        this.payload = payload;
        this.occurredAt = occurredAt;
    }

    public UUID getId() { return id; }
    public UUID getStoreId() { return storeId; }
    public String getPayload() { return payload; }
    public Instant getOccurredAt() { return occurredAt; }
    public Instant getPublishedAt() { return publishedAt; }
    public void markPublished(Instant publishedAt) { this.publishedAt = publishedAt; }
}
