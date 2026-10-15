package com.dealnear.offer.moderation;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OfferReportRepository extends JpaRepository<OfferReport, UUID> {
    Optional<OfferReport> findByOfferIdAndReporterId(UUID offerId, String reporterId);

    Page<OfferReport> findByStatus(OfferReport.Status status, Pageable pageable);

    List<OfferReport> findByOfferIdAndStatus(UUID offerId, OfferReport.Status status);
}
