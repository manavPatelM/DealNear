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
    /**
     * DRAFT -> PUBLISHED <-> PAUSED; DRAFT/PUBLISHED/PAUSED -> EXPIRED (vendor ends it early);
     * any non-removed state -> REMOVED (admin moderation, terminal for the vendor).
     * A PUBLISHED offer whose endAt has passed is also treated as expired at query time.
     */
    public enum Status { DRAFT, PUBLISHED, PAUSED, EXPIRED, REMOVED }

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
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OfferCategory category;
    @Column(name = "moderation_note", length = 500)
    private String moderationNote;

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
        this(vendorId, storeId, title, description, startAt, endAt, OfferCategory.OTHER);
    }

    public Offer(
            String vendorId,
            UUID storeId,
            String title,
            String description,
            Instant startAt,
            Instant endAt,
            OfferCategory category
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
        this.category = category;
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
    public OfferCategory getCategory() { return category; }
    public String getModerationNote() { return moderationNote; }
    public boolean isPublished() { return status == Status.PUBLISHED; }

    /** True when customers can no longer use the offer, whether ended explicitly or by time. */
    public boolean isExpired(Instant now) {
        return status == Status.EXPIRED || !endAt.isAfter(now);
    }

    void updateDraft(String title, String description) {
        this.title = title;
        this.description = description;
    }

    void updateDetails(String title, String description, OfferCategory category) {
        if (status == Status.EXPIRED || status == Status.REMOVED) {
            throw new InvalidOfferTransitionException("Expired or removed offers cannot be edited");
        }
        updateDraft(title, description);
        if (category != null) {
            this.category = category;
        }
    }

    void publish(Instant now) {
        if (status == Status.PUBLISHED) {
            return;
        }
        if (status != Status.DRAFT) {
            throw new InvalidOfferTransitionException("Only draft offers can be published");
        }
        requireFutureEnd(now);
        status = Status.PUBLISHED;
    }

    void publish() {
        publish(Instant.now());
    }

    void unpublish() {
        if (status == Status.EXPIRED || status == Status.REMOVED) {
            throw new InvalidOfferTransitionException("Expired or removed offers cannot be unpublished");
        }
        status = Status.DRAFT;
    }

    void pause() {
        if (status == Status.PAUSED) {
            return;
        }
        if (status != Status.PUBLISHED) {
            throw new InvalidOfferTransitionException("Only published offers can be paused");
        }
        status = Status.PAUSED;
    }

    void resume(Instant now) {
        if (status == Status.PUBLISHED) {
            return;
        }
        if (status != Status.PAUSED) {
            throw new InvalidOfferTransitionException("Only paused offers can be resumed");
        }
        requireFutureEnd(now);
        status = Status.PUBLISHED;
    }

    /** Ends the offer now. The original window is kept unless it would still be running. */
    void expire(Instant now) {
        if (status == Status.EXPIRED) {
            return;
        }
        if (status == Status.REMOVED) {
            throw new InvalidOfferTransitionException("Removed offers cannot be expired");
        }
        status = Status.EXPIRED;
        if (endAt.isAfter(now)) {
            endAt = now;
        }
    }

    /** Admin takedown. The note is shown to the vendor. */
    public void remove(String note) {
        if (status == Status.REMOVED) {
            throw new InvalidOfferTransitionException("Offer is already removed");
        }
        status = Status.REMOVED;
        moderationNote = note;
    }

    private void requireFutureEnd(Instant now) {
        if (!endAt.isAfter(now)) {
            throw new InvalidOfferValidityException("Offer endAt must be in the future");
        }
    }
}
