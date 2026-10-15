package com.dealnear.offer.offer;

import java.util.UUID;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface OfferRepository extends JpaRepository<Offer, UUID> {
    Optional<Offer> findByIdAndVendorId(UUID id, String vendorId);

    @Query("select o from Offer o where o.id = :id and o.status = :status and o.endAt > CURRENT_TIMESTAMP")
    Optional<Offer> findActiveByIdAndStatus(UUID id, Offer.Status status);

    @Query("select o from Offer o where o.status = :status and o.endAt > CURRENT_TIMESTAMP")
    Page<Offer> findActiveByStatus(Offer.Status status, Pageable pageable);

    Page<Offer> findByVendorIdOrderByCreatedAtDescIdDesc(String vendorId, Pageable pageable);
}
