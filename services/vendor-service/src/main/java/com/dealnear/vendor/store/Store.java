package com.dealnear.vendor.store;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "stores")
public class Store {
    /** Admin review state. Only VERIFIED stores can publish offers or appear publicly. */
    public enum VerificationStatus { PENDING, VERIFIED, REJECTED }

    @Id
    private UUID id;

    @Column(name = "vendor_id", nullable = false, updatable = false)
    private String vendorId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String address;

    @Column(nullable = false)
    private String city;

    @Column(nullable = false)
    private double latitude;

    @Column(nullable = false)
    private double longitude;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false)
    private VerificationStatus verificationStatus;

    @Column(name = "verification_note", length = 500)
    private String verificationNote;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    protected Store() {
    }

    public Store(String vendorId, String name, String address, String city, double latitude, double longitude) {
        this.id = UUID.randomUUID();
        this.vendorId = vendorId;
        this.name = name;
        this.address = address;
        this.city = city;
        this.latitude = latitude;
        this.longitude = longitude;
        this.createdAt = Instant.now();
        this.verificationStatus = VerificationStatus.PENDING;
    }

    public UUID getId() {
        return id;
    }

    public String getVendorId() {
        return vendorId;
    }

    public String getName() {
        return name;
    }

    public String getAddress() {
        return address;
    }

    public String getCity() {
        return city;
    }

    public double getLatitude() {
        return latitude;
    }

    public double getLongitude() {
        return longitude;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public VerificationStatus getVerificationStatus() {
        return verificationStatus;
    }

    public String getVerificationNote() {
        return verificationNote;
    }

    public Instant getReviewedAt() {
        return reviewedAt;
    }

    public boolean isVerified() {
        return verificationStatus == VerificationStatus.VERIFIED;
    }

    public void update(String name, String address, String city, double latitude, double longitude) {
        this.name = name;
        this.address = address;
        this.city = city;
        this.latitude = latitude;
        this.longitude = longitude;
        // Editing a rejected store is treated as a resubmission for review.
        if (verificationStatus == VerificationStatus.REJECTED) {
            verificationStatus = VerificationStatus.PENDING;
        }
    }

    void verify(Instant now) {
        if (verificationStatus == VerificationStatus.VERIFIED) {
            throw new InvalidStoreTransitionException("Store is already verified");
        }
        verificationStatus = VerificationStatus.VERIFIED;
        verificationNote = null;
        reviewedAt = now;
    }

    /** Rejects a pending submission or revokes an existing verification. */
    void reject(String note, Instant now) {
        if (verificationStatus == VerificationStatus.REJECTED) {
            throw new InvalidStoreTransitionException("Store is already rejected");
        }
        verificationStatus = VerificationStatus.REJECTED;
        verificationNote = note;
        reviewedAt = now;
    }
}
