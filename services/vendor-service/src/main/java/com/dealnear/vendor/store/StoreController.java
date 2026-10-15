package com.dealnear.vendor.store;

import jakarta.validation.Valid;
import java.util.UUID;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.RequestHeader;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/vendors/stores")
public class StoreController {
    private final StoreRepository storeRepository;
    private final String projectionToken;
    private final StoreProjectionOutboxService projectionOutboxService;

    public StoreController(
            StoreRepository storeRepository,
            @Value("${dealnear.projection-token}") String projectionToken,
            StoreProjectionOutboxService projectionOutboxService
    ) {
        this.storeRepository = storeRepository;
        this.projectionToken = projectionToken;
        this.projectionOutboxService = projectionOutboxService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('VENDOR')")
    public StoreResponse create(@Valid @RequestBody CreateStoreRequest request, Authentication authentication) {
        Store store = new Store(
                authentication.getName(),
                request.name(),
                request.address(),
                request.city(),
                request.latitude(),
                request.longitude()
        );
        return StoreResponse.from(storeRepository.save(store));
    }

    @GetMapping("/{storeId}")
    @PreAuthorize("hasRole('VENDOR')")
    public StoreResponse getById(@PathVariable UUID storeId, Authentication authentication) {
        return storeRepository.findByIdAndVendorId(storeId, authentication.getName())
                .map(StoreResponse::from)
                .orElseThrow(StoreNotFoundException::new);
    }

    @PatchMapping("/{storeId}")
    @Transactional
    @PreAuthorize("hasRole('VENDOR')")
    public StoreResponse update(
            @PathVariable UUID storeId,
            @Valid @RequestBody UpdateStoreRequest request,
            Authentication authentication
    ) {
        Store store = storeRepository.findByIdAndVendorId(storeId, authentication.getName())
                .orElseThrow(StoreNotFoundException::new);
        store.update(request.name(), request.address(), request.city(),
                request.latitude(), request.longitude());
        Store saved = storeRepository.save(store);
        projectionOutboxService.record(saved);
        return StoreResponse.from(saved);
    }

    @GetMapping
    @PreAuthorize("hasRole('VENDOR')")
    public StorePageResponse list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication
    ) {
        if (page < 0 || size < 1 || size > 50) {
            throw new InvalidPaginationException();
        }

        Page<Store> stores = storeRepository.findByVendorIdOrderByCreatedAtDescIdDesc(
                authentication.getName(),
                PageRequest.of(page, size, Sort.by(
                        Sort.Order.desc("createdAt"),
                        Sort.Order.desc("id")
                ))
        );
        return new StorePageResponse(
                stores.getContent().stream().map(StoreResponse::from).toList(),
                stores.getNumber(),
                stores.getSize(),
                stores.getTotalElements(),
                stores.getTotalPages()
        );
    }

    @GetMapping("/public/{storeId}")
    public PublicStoreSummary getPublicSummary(@PathVariable UUID storeId) {
        return storeRepository.findById(storeId)
                .map(PublicStoreSummary::from)
                .orElseThrow(StoreNotFoundException::new);
    }

    @GetMapping("/public")
    public List<PublicStoreSummary> getPublicSummaries(@RequestParam List<UUID> ids) {
        return storeRepository.findAllById(ids).stream()
                .map(PublicStoreSummary::from)
                .toList();
    }

    @GetMapping("/projection/{storeId}")
    public StoreProjectionDetails getProjectionDetails(
            @PathVariable UUID storeId,
            @RequestHeader("X-Projection-Token") String token
    ) {
        requireProjectionToken(token);
        return storeRepository.findById(storeId)
                .map(StoreProjectionDetails::from)
                .orElseThrow(StoreNotFoundException::new);
    }

    private void requireProjectionToken(String token) {
        if (!MessageDigest.isEqual(
                projectionToken.getBytes(StandardCharsets.UTF_8),
                token.getBytes(StandardCharsets.UTF_8)
        )) {
            throw new InvalidProjectionTokenException();
        }
    }
}
