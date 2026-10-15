package com.dealnear.offer.moderation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "offer_reports")
public class OfferReport {
    public enum Reason { MISLEADING, UNAVAILABLE, INAPPROPRIATE, SPAM, OTHER }

    /** OPEN until an admin dismisses it or takes the offer down (ACTIONED). */
    public enum Status { OPEN, DISMISSED, ACTIONED }

    @Id
    private UUID id;
    @Column(name = "offer_id", nullable = false, updatable = false)
    private UUID offerId;
    @Column(name = "reporter_id", nullable = false, updatable = false)
    private String reporterId;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Reason reason;
    @Column(length = 500)
    private String details;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @Column(name = "resolved_at")
    private Instant resolvedAt;
    @Column(name = "resolved_by")
    private String resolvedBy;
    @Column(name = "resolution_note", length = 500)
    private String resolutionNote;

    protected OfferReport() {
    }

    public OfferReport(UUID offerId, String reporterId, Reason reason, String details) {
        this.id = UUID.randomUUID();
        this.offerId = offerId;
        this.reporterId = reporterId;
        this.reason = reason;
        this.details = details;
        this.status = Status.OPEN;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getOfferId() { return offerId; }
    public String getReporterId() { return reporterId; }
    public Reason getReason() { return reason; }
    public String getDetails() { return details; }
    public Status getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getResolvedAt() { return resolvedAt; }
    public String getResolvedBy() { return resolvedBy; }
    public String getResolutionNote() { return resolutionNote; }

    void resolve(Status outcome, String adminId, String note, Instant now) {
        if (status != Status.OPEN) {
            throw new ReportAlreadyResolvedException();
        }
        status = outcome;
        resolvedBy = adminId;
        resolutionNote = note;
        resolvedAt = now;
    }
}
