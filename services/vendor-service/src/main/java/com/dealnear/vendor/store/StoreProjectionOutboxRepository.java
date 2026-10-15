package com.dealnear.vendor.store;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface StoreProjectionOutboxRepository extends JpaRepository<StoreProjectionOutboxEvent, UUID> {
    @Query("""
            SELECT event FROM StoreProjectionOutboxEvent event
            WHERE event.publishedAt IS NULL
            ORDER BY event.occurredAt ASC
            """)
    List<StoreProjectionOutboxEvent> findPending();
}
