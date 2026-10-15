package com.dealnear.offer.moderation;

import com.dealnear.offer.offer.InvalidPaginationException;
import com.dealnear.offer.offer.Offer;
import com.dealnear.offer.offer.OfferNotFoundException;
import com.dealnear.offer.offer.OfferRepository;
import com.dealnear.offer.offer.OfferResponse;
import com.dealnear.offer.outbox.OfferOutboxService;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/offers/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminModerationController {
    private final OfferReportRepository reportRepository;
    private final OfferRepository offerRepository;
    private final OfferOutboxService outboxService;

    public AdminModerationController(
            OfferReportRepository reportRepository,
            OfferRepository offerRepository,
            OfferOutboxService outboxService
    ) {
        this.reportRepository = reportRepository;
        this.offerRepository = offerRepository;
        this.outboxService = outboxService;
    }

    /** Moderation queue, oldest first, with the reported offer attached for review. */
    @GetMapping("/reports")
    public ReportPageResponse reports(
            @RequestParam(defaultValue = "OPEN") OfferReport.Status status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        if (page < 0 || size < 1 || size > 50) {
            throw new InvalidPaginationException();
        }
        Page<OfferReport> reports = reportRepository.findByStatus(status,
                PageRequest.of(page, size, Sort.by(Sort.Order.asc("createdAt"), Sort.Order.asc("id"))));
        List<UUID> offerIds = reports.getContent().stream().map(OfferReport::getOfferId).distinct().toList();
        Map<UUID, Offer> offers = offerRepository.findAllById(offerIds).stream()
                .collect(Collectors.toMap(Offer::getId, Function.identity()));
        return new ReportPageResponse(
                reports.getContent().stream()
                        .map(report -> AdminReportResponse.from(report, offers.get(report.getOfferId())))
                        .toList(),
                reports.getNumber(), reports.getSize(), reports.getTotalElements(), reports.getTotalPages());
    }

    @PostMapping("/reports/{reportId}/dismiss")
    @Transactional
    public AdminReportResponse dismiss(
            @PathVariable UUID reportId,
            @Valid @RequestBody(required = false) ModerationRequests.Dismiss request,
            Authentication authentication
    ) {
        OfferReport report = reportRepository.findById(reportId).orElseThrow(ReportNotFoundException::new);
        String note = request == null ? null : ReportController.blankToNull(request.note());
        report.resolve(OfferReport.Status.DISMISSED, authentication.getName(), note, Instant.now());
        return AdminReportResponse.from(reportRepository.save(report),
                offerRepository.findById(report.getOfferId()).orElse(null));
    }

    /**
     * Takes an offer down regardless of vendor state, removes it from discovery, and closes
     * every open report against it as ACTIONED.
     */
    @PostMapping("/offers/{offerId}/remove")
    @Transactional
    public OfferResponse removeOffer(
            @PathVariable UUID offerId,
            @Valid @RequestBody ModerationRequests.RemoveOffer request,
            Authentication authentication
    ) {
        Offer offer = offerRepository.findById(offerId).orElseThrow(OfferNotFoundException::new);
        boolean wasLive = offer.isPublished();
        String reason = request.reason().trim();
        offer.remove(reason);
        Offer saved = offerRepository.save(offer);
        if (wasLive) {
            outboxService.recordRemoval(saved);
        }
        Instant now = Instant.now();
        for (OfferReport report : reportRepository.findByOfferIdAndStatus(offerId, OfferReport.Status.OPEN)) {
            report.resolve(OfferReport.Status.ACTIONED, authentication.getName(), reason, now);
            reportRepository.save(report);
        }
        return OfferResponse.from(saved);
    }

    public record AdminReportResponse(
            UUID id,
            UUID offerId,
            String reason,
            String details,
            String status,
            Instant createdAt,
            Instant resolvedAt,
            String resolutionNote,
            OfferResponse offer
    ) {
        static AdminReportResponse from(OfferReport report, Offer offer) {
            return new AdminReportResponse(report.getId(), report.getOfferId(), report.getReason().name(),
                    report.getDetails(), report.getStatus().name(), report.getCreatedAt(),
                    report.getResolvedAt(), report.getResolutionNote(),
                    offer == null ? null : OfferResponse.from(offer));
        }
    }

    public record ReportPageResponse(
            List<AdminReportResponse> reports, int page, int size, long totalElements, int totalPages) {
    }
}
