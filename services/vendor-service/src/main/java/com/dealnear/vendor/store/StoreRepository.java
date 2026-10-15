package com.dealnear.vendor.store;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface StoreRepository extends JpaRepository<Store, UUID> {
    Optional<Store> findByIdAndVendorId(UUID id, String vendorId);

    Page<Store> findByVendorIdOrderByCreatedAtDescIdDesc(String vendorId, Pageable pageable);
}
