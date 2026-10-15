package com.dealnear.offer.ownership;

import java.util.Optional;
import java.util.UUID;

public interface StoreOwnershipVerifier {
    boolean vendorOwnsStore(UUID storeId, String authorization);

    /**
     * Returns the store's admin verification status when the caller owns it, or empty when
     * the store is missing, not owned, or vendor-service cannot be reached.
     */
    Optional<String> ownedStoreVerificationStatus(UUID storeId, String authorization);
}
