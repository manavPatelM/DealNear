package com.dealnear.offer.ownership;

import java.util.Optional;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface StoreSummaryClient {
    Optional<StoreSummary> findById(UUID storeId);

    Map<UUID, StoreSummary> findByIds(List<UUID> storeIds);
}
