package com.dealnear.identity.savedoffer;

import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth/saved-offers")
@PreAuthorize("hasRole('CUSTOMER')")
public class SavedOfferController {
    private final SavedOfferRepository savedOffers;

    public SavedOfferController(SavedOfferRepository savedOffers) {
        this.savedOffers = savedOffers;
    }

    @PostMapping("/{offerId}")
    @Transactional
    public SavedOfferResponse save(
            @PathVariable UUID offerId,
            Authentication authentication
    ) {
        UUID customerId = customerId(authentication);
        SavedOffer saved = savedOffers.findByCustomerIdAndOfferId(customerId, offerId)
                .orElseGet(() -> savedOffers.save(new SavedOffer(customerId, offerId)));
        return SavedOfferResponse.from(saved);
    }

    @DeleteMapping("/{offerId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void unsave(@PathVariable UUID offerId, Authentication authentication) {
        savedOffers.findByCustomerIdAndOfferId(customerId(authentication), offerId)
                .ifPresent(savedOffers::delete);
    }

    @GetMapping
    public SavedOfferPageResponse list(Authentication authentication) {
        List<SavedOfferResponse> saved = savedOffers
                .findByCustomerIdOrderBySavedAtDescOfferIdDesc(customerId(authentication))
                .stream()
                .map(SavedOfferResponse::from)
                .toList();
        return new SavedOfferPageResponse(saved);
    }

    private UUID customerId(Authentication authentication) {
        return UUID.fromString(authentication.getName());
    }

    public record SavedOfferResponse(UUID id, UUID offerId, java.time.Instant savedAt) {
        static SavedOfferResponse from(SavedOffer saved) {
            return new SavedOfferResponse(saved.getId(), saved.getOfferId(), saved.getSavedAt());
        }
    }

    public record SavedOfferPageResponse(List<SavedOfferResponse> savedOffers) {}
}
