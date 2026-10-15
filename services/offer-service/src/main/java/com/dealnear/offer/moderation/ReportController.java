package com.dealnear.offer.moderation;

import com.dealnear.offer.offer.Offer;
import com.dealnear.offer.offer.OfferNotFoundException;
import com.dealnear.offer.offer.OfferRepository;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** Customers flag live offers they believe are invalid or inappropriate. */
@RestController
public class ReportController {
    private final OfferRepository offerRepository;
    private final OfferReportRepository reportRepository;

    public ReportController(OfferRepository offerRepository, OfferReportRepository reportRepository) {
        this.offerRepository = offerRepository;
        this.reportRepository = reportRepository;
    }

    /**
     * Only offers customers can currently see may be reported. A repeat report from the same
     * customer returns the existing report (200) instead of creating a duplicate (201).
     */
    @PostMapping("/api/offers/{offerId}/reports")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Transactional
    public ResponseEntity<ReportResponse> report(
            @PathVariable UUID offerId,
            @Valid @RequestBody ModerationRequests.CreateReport request,
            Authentication authentication
    ) {
        Offer offer = offerRepository.findActiveByIdAndStatus(offerId, Offer.Status.PUBLISHED)
                .orElseThrow(OfferNotFoundException::new);
        String reporterId = authentication.getName();
        return reportRepository.findByOfferIdAndReporterId(offer.getId(), reporterId)
                .map(existing -> ResponseEntity.ok(ReportResponse.from(existing)))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.CREATED).body(ReportResponse.from(
                        reportRepository.save(new OfferReport(offer.getId(), reporterId, request.reason(),
                                blankToNull(request.details()))))));
    }

    static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    /** Reporter identity is deliberately omitted from customer-facing responses. */
    public record ReportResponse(UUID id, UUID offerId, String reason, String status, Instant createdAt) {
        static ReportResponse from(OfferReport report) {
            return new ReportResponse(report.getId(), report.getOfferId(), report.getReason().name(),
                    report.getStatus().name(), report.getCreatedAt());
        }
    }
}
