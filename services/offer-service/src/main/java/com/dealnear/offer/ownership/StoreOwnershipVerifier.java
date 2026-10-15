package com.dealnear.offer.ownership;

import java.util.UUID;

public interface StoreOwnershipVerifier {
    boolean vendorOwnsStore(UUID storeId, String authorization);
}
