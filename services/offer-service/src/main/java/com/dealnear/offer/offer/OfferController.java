package com.dealnear.offer.offer;

import com.dealnear.offer.category.CategoryService;
import com.dealnear.offer.ownership.StoreOwnershipVerifier;
import com.dealnear.offer.ownership.StoreSummary;
import com.dealnear.offer.ownership.StoreSummaryClient;
import com.dealnear.offer.outbox.OfferOutboxService;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/offers")
public class OfferController {
    private static final int MAX_PAGE_SIZE = 50;

    private final OfferRepository offerRepository;
    private final StoreOwnershipVerifier storeOwnershipVerifier;
    private final StoreSummaryClient storeSummaryClient;
    private final OfferOutboxService outboxService;
    private final CategoryService categoryService;

    public OfferController(
            OfferRepository offerRepository,
            StoreOwnershipVerifier storeOwnershipVerifier,
            StoreSummaryClient storeSummaryClient,
            OfferOutboxService outboxService,
            CategoryService categoryService
    ) {
        this.categoryService = categoryService;
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
        // Drafts may be prepared while the store is still awaiting admin verification.
        if (request.storeId() == null
                || !storeOwnershipVerifier.vendorOwnsStore(request.storeId(), authorization)) {
            throw new StoreOwnershipException();
        }
        validateWindow(request.startAt(), request.endAt());
        String category = categoryService.requireAssignable(request.category());
        return OfferResponse.from(offerRepository.save(new Offer(
                authentication.getName(), request.storeId(), request.title(), request.description(),
                request.startAt(), request.endAt(), category
        )));
    }

    @GetMapping("/{offerId}")
    @PreAuthorize("hasRole('VENDOR')")
    public OfferResponse getById(@PathVariable UUID offerId, Authentication authentication) {
        return OfferResponse.from(owned(offerId, authentication));
    }

    @PatchMapping("/{offerId}")
    @Transactional
    @PreAuthorize("hasRole('VENDOR')")
    public OfferResponse updateDraft(
            @PathVariable UUID offerId,
            @Valid @RequestBody UpdateOfferRequest request,
            Authentication authentication
    ) {
        Offer offer = owned(offerId, authentication);
        String category = request.category() == null ? null : categoryService.requireAssignable(request.category());
        offer.updateDetails(request.title(), request.description(), category);
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
            @RequestHeader("Authorization") String authorization,
            Authentication authentication
    ) {
        Offer offer = owned(offerId, authentication);
        if (offer.isPublished()) {
            return OfferResponse.from(offer);
        }
        offer.publish(Instant.now());
        requireVerifiedStore(offer, authorization);
        return goLive(offer);
    }

    @PostMapping("/{offerId}/resume")
    @Transactional
    @PreAuthorize("hasRole('VENDOR')")
    public OfferResponse resume(
            @PathVariable UUID offerId,
            @RequestHeader("Authorization") String authorization,
            Authentication authentication
    ) {
        Offer offer = owned(offerId, authentication);
        if (offer.isPublished()) {
            return OfferResponse.from(offer);
        }
        offer.resume(Instant.now());
        requireVerifiedStore(offer, authorization);
        return goLive(offer);
    }

    @PostMapping("/{offerId}/pause")
    @Transactional
    @PreAuthorize("hasRole('VENDOR')")
    public OfferResponse pause(@PathVariable UUID offerId, Authentication authentication) {
        Offer offer = owned(offerId, authentication);
        return takeOffline(offer, offer::pause);
    }

    @PostMapping("/{offerId}/unpublish")
    @Transactional
    @PreAuthorize("hasRole('VENDOR')")
    public OfferResponse unpublish(@PathVariable UUID offerId, Authentication authentication) {
        Offer offer = owned(offerId, authentication);
        if (offer.getStatus() == Offer.Status.DRAFT) {
            return OfferResponse.from(offer);
        }
        return takeOffline(offer, offer::unpublish);
    }

    @PostMapping("/{offerId}/expire")
    @Transactional
    @PreAuthorize("hasRole('VENDOR')")
    public OfferResponse expire(@PathVariable UUID offerId, Authentication authentication) {
        Offer offer = owned(offerId, authentication);
        return takeOffline(offer, () -> offer.expire(Instant.now()));
    }

    @DeleteMapping("/{offerId}")
    @Transactional
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('VENDOR')")
    public void delete(@PathVariable UUID offerId, Authentication authentication) {
        Offer offer = owned(offerId, authentication);
        if (offer.isPublished()) {
            outboxService.recordRemoval(offer);
        }
        offerRepository.delete(offer);
    }

    @GetMapping("/public/{offerId}")
    public PublicOfferResponse getPublished(@PathVariable UUID offerId) {
        return offerRepository.findActiveByIdAndStatus(offerId, Offer.Status.PUBLISHED)
                .flatMap(offer -> storeSummaryClient.findById(offer.getStoreId())
                        .map(store -> PublicOfferResponse.from(offer, store)))
                .orElseThrow(OfferNotFoundException::new);
    }

    /**
     * Public listing of live offers. Optional filters combine with AND: {@code category},
     * {@code storeId} (a store's other offers), and {@code ids} (up to 50, e.g. a saved list).
     */
    @GetMapping("/public")
    public PublicOfferPageResponse listPublished(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) UUID storeId,
            @RequestParam(required = false) List<UUID> ids
    ) {
        validatePage(page, size);
        if (ids != null && ids.size() > MAX_PAGE_SIZE) {
            throw new InvalidPaginationException();
        }

        Page<Offer> offers = offerRepository.findAll(
                Specification.allOf(
                        PublicOfferSpecifications.active(),
                        PublicOfferSpecifications.inCategories(
                                category == null || category.isBlank() ? null : categoryService.expandForFilter(category)),
                        PublicOfferSpecifications.atStore(storeId),
                        PublicOfferSpecifications.withIds(ids)
                ),
                PageRequest.of(page, size, newestFirst())
        );
        List<UUID> storeIds = offers.getContent().stream().map(Offer::getStoreId).distinct().toList();
        Map<UUID, StoreSummary> summaries = storeSummaryClient.findByIds(storeIds);
        // Offers whose store has no public summary (not verified, or verification revoked) are hidden.
        // Totals still count them; this is rare because publishing requires a verified store.
        return new PublicOfferPageResponse(
                offers.getContent().stream()
                        .map(offer -> {
                            StoreSummary summary = summaries.get(offer.getStoreId());
                            return summary == null ? null : PublicOfferResponse.from(offer, summary);
                        })
                        .filter(Objects::nonNull)
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
        validatePage(page, size);
        Page<Offer> offers = offerRepository.findByVendorIdOrderByCreatedAtDescIdDesc(
                authentication.getName(),
                PageRequest.of(page, size, newestFirst())
        );
        return new OfferPageResponse(
                offers.getContent().stream().map(OfferResponse::from).toList(),
                offers.getNumber(),
                offers.getSize(),
                offers.getTotalElements(),
                offers.getTotalPages()
        );
    }

    private Offer owned(UUID offerId, Authentication authentication) {
        return offerRepository.findByIdAndVendorId(offerId, authentication.getName())
                .orElseThrow(OfferNotFoundException::new);
    }

    private void requireVerifiedStore(Offer offer, String authorization) {
        String status = storeOwnershipVerifier
                .ownedStoreVerificationStatus(offer.getStoreId(), authorization)
                .orElseThrow(StoreOwnershipException::new);
        if (!"VERIFIED".equals(status)) {
            throw new StoreNotVerifiedException();
        }
    }

    private OfferResponse goLive(Offer offer) {
        Offer saved = offerRepository.save(offer);
        outboxService.recordProjection(saved);
        return OfferResponse.from(saved);
    }

    /** Applies a transition and, if the offer was live, removes it from discovery. */
    private OfferResponse takeOffline(Offer offer, Runnable transition) {
        boolean wasLive = offer.isPublished();
        transition.run();
        Offer saved = offerRepository.save(offer);
        if (wasLive && !saved.isPublished()) {
            outboxService.recordRemoval(saved);
        }
        return OfferResponse.from(saved);
    }

    private static Sort newestFirst() {
        return Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));
    }

    private static void validatePage(int page, int size) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new InvalidPaginationException();
        }
    }

    private void validateWindow(Instant startAt, Instant endAt) {
        if (!endAt.isAfter(startAt)) {
            throw new InvalidOfferValidityException("Offer endAt must be after startAt");
        }
    }
}
