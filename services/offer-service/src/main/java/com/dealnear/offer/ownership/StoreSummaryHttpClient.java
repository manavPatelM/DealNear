package com.dealnear.offer.ownership;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Optional;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class StoreSummaryHttpClient implements StoreSummaryClient {
    private final HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(2))
            .build();
    private final ObjectMapper objectMapper;
    private final String vendorServiceUrl;

    public StoreSummaryHttpClient(
            ObjectMapper objectMapper,
            @Value("${dealnear.vendor-service-url}") String vendorServiceUrl
    ) {
        this.objectMapper = objectMapper;
        this.vendorServiceUrl = vendorServiceUrl;
    }

    @Override
    public Optional<StoreSummary> findById(UUID storeId) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(vendorServiceUrl + "/api/vendors/stores/public/" + storeId))
                    .timeout(Duration.ofSeconds(3))
                    .GET()
                    .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 404) {
                return Optional.empty();
            }
            if (response.statusCode() != 200) {
                throw new StoreSummaryUnavailableException();
            }
            return Optional.of(objectMapper.readValue(response.body(), StoreSummary.class));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new StoreSummaryUnavailableException();
        } catch (IOException | IllegalArgumentException exception) {
            throw new StoreSummaryUnavailableException();
        }
    }

    @Override
    public Map<UUID, StoreSummary> findByIds(List<UUID> storeIds) {
            if (storeIds.isEmpty()) {
                return Map.of();
            }
            try {
                String ids = storeIds.stream().map(UUID::toString).collect(java.util.stream.Collectors.joining(","));
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(vendorServiceUrl + "/api/vendors/stores/public?ids=" + ids))
                        .timeout(Duration.ofSeconds(3))
                        .GET()
                        .build();
                HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() != 200) {
                    throw new StoreSummaryUnavailableException();
                }
                List<StoreSummary> summaries = objectMapper.readValue(
                        response.body(), new TypeReference<List<StoreSummary>>() {});
                Map<UUID, StoreSummary> result = new HashMap<>();
                summaries.forEach(summary -> result.put(summary.id(), summary));
                return result;
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                throw new StoreSummaryUnavailableException();
            } catch (IOException | IllegalArgumentException exception) {
                throw new StoreSummaryUnavailableException();
        }
    }
}
