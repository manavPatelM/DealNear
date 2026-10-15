package com.dealnear.identity.savedoffer;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SavedOfferRepository extends JpaRepository<SavedOffer, UUID> {
    Optional<SavedOffer> findByCustomerIdAndOfferId(UUID customerId, UUID offerId);

    List<SavedOffer> findByCustomerIdOrderBySavedAtDescOfferIdDesc(UUID customerId);
}
