package com.dealnear.offer.outbox;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface OfferOutboxRepository extends JpaRepository<OfferOutboxEvent, UUID> {
    @Query("""
            SELECT event FROM OfferOutboxEvent event
            WHERE event.publishedAt IS NULL
              AND (event.nextAttemptAt IS NULL OR event.nextAttemptAt <= CURRENT_TIMESTAMP)
            ORDER BY event.occurredAt ASC
            """)
    List<OfferOutboxEvent> findPending();
}
