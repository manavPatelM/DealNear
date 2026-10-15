package com.dealnear.offer.ownership;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class StoreOwnershipClient implements StoreOwnershipVerifier {
    private final HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(2))
            .build();
    private final String vendorServiceUrl;
    private final ObjectMapper objectMapper;

    public StoreOwnershipClient(
            @Value("${dealnear.vendor-service-url}") String vendorServiceUrl,
            ObjectMapper objectMapper
    ) {
        this.vendorServiceUrl = vendorServiceUrl;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean vendorOwnsStore(UUID storeId, String authorization) {
        return fetchOwnedStore(storeId, authorization).isPresent();
    }

    @Override
    public Optional<String> ownedStoreVerificationStatus(UUID storeId, String authorization) {
        return fetchOwnedStore(storeId, authorization)
                .map(store -> store.path("verificationStatus").asText("PENDING"));
    }

    private Optional<JsonNode> fetchOwnedStore(UUID storeId, String authorization) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(vendorServiceUrl + "/api/vendors/stores/" + storeId))
                    .timeout(Duration.ofSeconds(3))
                    .header("Authorization", authorization)
                    .GET()
                    .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                return Optional.empty();
            }
            return Optional.of(objectMapper.readTree(response.body()));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        } catch (java.io.IOException | IllegalArgumentException exception) {
            return Optional.empty();
        }
    }
}
