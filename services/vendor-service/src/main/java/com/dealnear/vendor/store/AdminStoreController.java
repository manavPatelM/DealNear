package com.dealnear.vendor.store;

import jakarta.validation.Valid;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Admin review of vendor store submissions. */
@RestController
@RequestMapping("/api/vendors/admin/stores")
@PreAuthorize("hasRole('ADMIN')")
public class AdminStoreController {
    private final StoreRepository storeRepository;
    private final StoreProjectionOutboxService projectionOutboxService;

    public AdminStoreController(
            StoreRepository storeRepository,
            StoreProjectionOutboxService projectionOutboxService
    ) {
        this.storeRepository = storeRepository;
        this.projectionOutboxService = projectionOutboxService;
    }

    /** Oldest submissions first, so the review queue is worked in arrival order. */
    @GetMapping
    public StorePageResponse list(
            @RequestParam(defaultValue = "PENDING") Store.VerificationStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        if (page < 0 || size < 1 || size > 50) {
            throw new InvalidPaginationException();
        }
        Page<Store> stores = storeRepository.findByVerificationStatus(status,
                PageRequest.of(page, size, Sort.by(Sort.Order.asc("createdAt"), Sort.Order.asc("id"))));
        return new StorePageResponse(
                stores.getContent().stream().map(StoreResponse::from).toList(),
                stores.getNumber(), stores.getSize(), stores.getTotalElements(), stores.getTotalPages());
    }

    @PostMapping("/{storeId}/verify")
    @Transactional
    public StoreResponse verify(@PathVariable UUID storeId) {
        Store store = storeRepository.findById(storeId).orElseThrow(StoreNotFoundException::new);
        store.verify(Instant.now());
        return StoreResponse.from(saveAndProject(store));
    }

    @PostMapping("/{storeId}/reject")
    @Transactional
    public StoreResponse reject(@PathVariable UUID storeId, @Valid @RequestBody RejectStoreRequest request) {
        Store store = storeRepository.findById(storeId).orElseThrow(StoreNotFoundException::new);
        store.reject(request.reason().trim(), Instant.now());
        return StoreResponse.from(saveAndProject(store));
    }

    // Verification changes discovery visibility, so the change is recorded in the same transaction.
    private Store saveAndProject(Store store) {
        Store saved = storeRepository.save(store);
        projectionOutboxService.record(saved);
        return saved;
    }
}
