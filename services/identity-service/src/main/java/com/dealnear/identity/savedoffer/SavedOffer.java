package com.dealnear.identity.savedoffer;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "saved_offers")
public class SavedOffer {
    @Id
    private UUID id;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(name = "offer_id", nullable = false)
    private UUID offerId;

    @Column(name = "saved_at", nullable = false)
    private Instant savedAt;

    protected SavedOffer() {}

    public SavedOffer(UUID customerId, UUID offerId) {
        this.id = UUID.randomUUID();
        this.customerId = customerId;
        this.offerId = offerId;
        this.savedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getCustomerId() {
        return customerId;
    }

    public UUID getOfferId() {
        return offerId;
    }

    public Instant getSavedAt() {
        return savedAt;
    }
}
