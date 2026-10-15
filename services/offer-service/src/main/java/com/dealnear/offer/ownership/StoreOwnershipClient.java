package com.dealnear.offer.ownership;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class StoreOwnershipClient implements StoreOwnershipVerifier {
    private final HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(2))
            .build();
    private final String vendorServiceUrl;

    public StoreOwnershipClient(@Value("${dealnear.vendor-service-url}") String vendorServiceUrl) {
        this.vendorServiceUrl = vendorServiceUrl;
    }

    @Override
    public boolean vendorOwnsStore(UUID storeId, String authorization) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(vendorServiceUrl + "/api/vendors/stores/" + storeId))
                    .timeout(Duration.ofSeconds(3))
                    .header("Authorization", authorization)
                    .GET()
                    .build();
            HttpResponse<Void> response = client.send(request, HttpResponse.BodyHandlers.discarding());
            return response.statusCode() == 200;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return false;
        } catch (java.io.IOException | IllegalArgumentException exception) {
            return false;
        }
    }
}
