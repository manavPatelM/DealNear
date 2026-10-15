package com.dealnear.offer.offer;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "offers")
public class Offer {
    public enum Status { DRAFT, PUBLISHED }

    @Id
    private UUID id;
    @Column(name = "vendor_id", nullable = false, updatable = false)
    private String vendorId;
    @Column(name = "store_id", nullable = false, updatable = false)
    private UUID storeId;
    @Column(nullable = false)
    private String title;
    @Column(nullable = false, length = 2000)
    private String description;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @Column(name = "start_at", nullable = false)
    private Instant startAt;
    @Column(name = "end_at", nullable = false)
    private Instant endAt;

    protected Offer() {
    }

    public Offer(String vendorId, UUID storeId, String title, String description) {
        this(vendorId, storeId, title, description, Instant.now(), Instant.now().plusSeconds(30L * 24 * 60 * 60));
    }

    public Offer(
            String vendorId,
            UUID storeId,
            String title,
            String description,
            Instant startAt,
            Instant endAt
    ) {
        this.id = UUID.randomUUID();
        this.vendorId = vendorId;
        this.storeId = storeId;
        this.title = title;
        this.description = description;
        this.status = Status.DRAFT;
        this.createdAt = Instant.now();
        this.startAt = startAt;
        this.endAt = endAt;
    }

    public UUID getId() { return id; }
    public String getVendorId() { return vendorId; }
    public UUID getStoreId() { return storeId; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public Status getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getStartAt() { return startAt; }
    public Instant getEndAt() { return endAt; }
    public boolean isPublished() { return status == Status.PUBLISHED; }

    void updateDraft(String title, String description) {
        this.title = title;
        this.description = description;
    }

    void publish(Instant now) {
        if (status == Status.DRAFT) {
            if (!endAt.isAfter(now)) {
                throw new InvalidOfferValidityException("Offer endAt must be in the future");
            }
            status = Status.PUBLISHED;
        }
    }

    void publish() {
        publish(Instant.now());
    }

    void unpublish() {
        status = Status.DRAFT;
    }
}
