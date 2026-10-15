package com.dealnear.vendor.store;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import org.springframework.stereotype.Service;

@Service
public class StoreProjectionOutboxService {
    private final StoreProjectionOutboxRepository repository;
    private final ObjectMapper objectMapper;

    public StoreProjectionOutboxService(
            StoreProjectionOutboxRepository repository,
            ObjectMapper objectMapper
    ) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    public void record(Store store) {
        try {
            Instant version = Instant.now();
            repository.save(new StoreProjectionOutboxEvent(
                    store.getId(),
                    objectMapper.writeValueAsString(new StoreProjectionUpdate(
                            store.getId(), store.getName(), store.getCity(),
                            store.getLatitude(), store.getLongitude(), version
                    )),
                    version
            ));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Could not serialize store projection event", exception);
        }
    }

    public record StoreProjectionUpdate(
            java.util.UUID storeId,
            String storeName,
            String storeCity,
            double latitude,
            double longitude,
            Instant projectionVersion
    ) {
    }
}
