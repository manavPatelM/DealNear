package com.dealnear.offer.offer;

import com.dealnear.offer.ownership.StoreOwnershipVerifier;
import com.dealnear.offer.ownership.StoreSummaryClient;
import com.dealnear.offer.outbox.OfferOutboxService;
import jakarta.validation.Valid;
import java.util.UUID;
import java.util.List;
import java.util.Map;
import java.time.Instant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/offers")
public class OfferController {
    private final OfferRepository offerRepository;
    private final StoreOwnershipVerifier storeOwnershipVerifier;
    private final StoreSummaryClient storeSummaryClient;
    private final OfferOutboxService outboxService;

    public OfferController(
            OfferRepository offerRepository,
            StoreOwnershipVerifier storeOwnershipVerifier,
            StoreSummaryClient storeSummaryClient,
            OfferOutboxService outboxService
    ) {
        this.offerRepository = offerRepository;
        this.storeOwnershipVerifier = storeOwnershipVerifier;
        this.storeSummaryClient = storeSummaryClient;
        this.outboxService = outboxService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('VENDOR')")
    public OfferResponse createDraft(
            @Valid @RequestBody CreateOfferRequest request,
            @RequestHeader("Authorization") String authorization,
            Authentication authentication
    ) {
        if (request.storeId() == null
                || !storeOwnershipVerifier.vendorOwnsStore(request.storeId(), authorization)) {
            throw new StoreOwnershipException();
        }
        validateWindow(request.startAt(), request.endAt());
        return OfferResponse.from(offerRepository.save(new Offer(
                authentication.getName(), request.storeId(), request.title(), request.description(),
                request.startAt(), request.endAt()
        )));
    }

    @GetMapping("/{offerId}")
    @PreAuthorize("hasRole('VENDOR')")
    public OfferResponse getById(@PathVariable UUID offerId, Authentication authentication) {
        return offerRepository.findByIdAndVendorId(offerId, authentication.getName())
                .map(OfferResponse::from)
                .orElseThrow(OfferNotFoundException::new);
    }

    @PatchMapping("/{offerId}")
    @Transactional
    @PreAuthorize("hasRole('VENDOR')")
    public OfferResponse updateDraft(
            @PathVariable UUID offerId,
            @Valid @RequestBody UpdateOfferRequest request,
            Authentication authentication
    ) {
        Offer offer = offerRepository.findByIdAndVendorId(offerId, authentication.getName())
                .orElseThrow(OfferNotFoundException::new);
        offer.updateDraft(request.title(), request.description());
        Offer saved = offerRepository.save(offer);
        if (saved.isPublished()) {
            outboxService.recordProjection(saved);
        }
        return OfferResponse.from(saved);
    }

    @PostMapping("/{offerId}/publish")
    @Transactional
    @PreAuthorize("hasRole('VENDOR')")
    public OfferResponse publish(
            @PathVariable UUID offerId,
            Authentication authentication
    ) {
        Offer offer = offerRepository.findByIdAndVendorId(offerId, authentication.getName())
                .orElseThrow(OfferNotFoundException::new);
        offer.publish(Instant.now());
        Offer saved = offerRepository.save(offer);
        outboxService.recordProjection(saved);
        return OfferResponse.from(saved);
    }

    @PostMapping("/{offerId}/unpublish")
    @Transactional
    @PreAuthorize("hasRole('VENDOR')")
    public OfferResponse unpublish(@PathVariable UUID offerId, Authentication authentication) {
        Offer offer = offerRepository.findByIdAndVendorId(offerId, authentication.getName())
                .orElseThrow(OfferNotFoundException::new);
        if (!offer.isPublished()) {
            return OfferResponse.from(offer);
        }
        offer.unpublish();
        Offer saved = offerRepository.save(offer);
        outboxService.recordRemoval(saved);
        return OfferResponse.from(saved);
    }

    @DeleteMapping("/{offerId}")
    @Transactional
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('VENDOR')")
    public void delete(@PathVariable UUID offerId, Authentication authentication) {
        Offer offer = offerRepository.findByIdAndVendorId(offerId, authentication.getName())
                .orElseThrow(OfferNotFoundException::new);
        if (offer.isPublished()) {
            outboxService.recordRemoval(offer);
        }
        offerRepository.delete(offer);
    }

    @GetMapping("/public/{offerId}")
    public PublicOfferResponse getPublished(@PathVariable UUID offerId) {
        return offerRepository.findActiveByIdAndStatus(offerId, Offer.Status.PUBLISHED)
                .map(offer -> toPublicResponse(offer))
                .orElseThrow(OfferNotFoundException::new);
    }

    @GetMapping("/public")
    public PublicOfferPageResponse listPublished(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        if (page < 0 || size < 1 || size > 50) {
            throw new InvalidPaginationException();
        }

        Page<Offer> offers = offerRepository.findActiveByStatus(
                Offer.Status.PUBLISHED,
                PageRequest.of(page, size, Sort.by(
                        Sort.Order.desc("createdAt"),
                        Sort.Order.desc("id")
                ))
        );
        List<UUID> storeIds = offers.getContent().stream().map(Offer::getStoreId).distinct().toList();
        Map<UUID, com.dealnear.offer.ownership.StoreSummary> summaries =
                storeSummaryClient.findByIds(storeIds);
        return new PublicOfferPageResponse(
                offers.getContent().stream()
                        .map(offer -> toPublicResponse(offer, summaries))
                        .toList(),
                offers.getNumber(),
                offers.getSize(),
                offers.getTotalElements(),
                offers.getTotalPages()
        );
    }

    @GetMapping
    @PreAuthorize("hasRole('VENDOR')")
    public OfferPageResponse list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication
    ) {
        if (page < 0 || size < 1 || size > 50) {
            throw new InvalidPaginationException();
        }

        Page<Offer> offers = offerRepository.findByVendorIdOrderByCreatedAtDescIdDesc(
                authentication.getName(),
                PageRequest.of(page, size, Sort.by(
                        Sort.Order.desc("createdAt"),
                        Sort.Order.desc("id")
                ))
        );
        return new OfferPageResponse(
                offers.getContent().stream().map(OfferResponse::from).toList(),
                offers.getNumber(),
                offers.getSize(),
                offers.getTotalElements(),
                offers.getTotalPages()
        );
    }

    private PublicOfferResponse toPublicResponse(Offer offer) {
        return storeSummaryClient.findById(offer.getStoreId())
                .map(store -> PublicOfferResponse.from(offer, store))
                .orElseThrow(OfferNotFoundException::new);
    }

    private void validateWindow(Instant startAt, Instant endAt) {
        if (!endAt.isAfter(startAt)) {
            throw new InvalidOfferValidityException("Offer endAt must be after startAt");
        }
    }

    private PublicOfferResponse toPublicResponse(
            Offer offer,
            Map<UUID, com.dealnear.offer.ownership.StoreSummary> summaries
    ) {
        com.dealnear.offer.ownership.StoreSummary summary = summaries.get(offer.getStoreId());
        if (summary == null) {
            throw new OfferNotFoundException();
        }
        return PublicOfferResponse.from(offer, summary);
    }
}
