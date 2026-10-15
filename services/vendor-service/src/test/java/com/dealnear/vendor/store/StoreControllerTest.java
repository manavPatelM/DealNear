package com.dealnear.vendor.store;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class StoreControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private StoreProjectionOutboxRepository projectionOutboxRepository;

    @Test
    void createsStoreForAuthenticatedVendor() throws Exception {
        mockMvc.perform(post("/api/vendors/stores")
                        .header("Authorization", "Bearer " + vendorToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Corner Market","address":"1 Main St","city":"New York","latitude":40.7,"longitude":-74.0}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.vendorId").value("vendor-1"))
                .andExpect(jsonPath("$.name").value("Corner Market"))
                .andExpect(jsonPath("$.address").value("1 Main St"));
    }

    @Test
    void rejectsUnauthenticatedStoreCreation() throws Exception {
        mockMvc.perform(post("/api/vendors/stores")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Corner Market","address":"1 Main St","city":"New York","latitude":40.7,"longitude":-74.0}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsInvalidStoreCoordinates() throws Exception {
        mockMvc.perform(post("/api/vendors/stores")
                        .header("Authorization", "Bearer " + vendorToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Corner Market","address":"1 Main St","city":"New York","latitude":100,"longitude":-74.0}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void retrievesOwnedStore() throws Exception {
        Store store = storeRepository.save(new Store(
                "vendor-1", "Corner Market", "1 Main St", "New York", 40.7, -74.0
        ));

        mockMvc.perform(get("/api/vendors/stores/" + store.getId())
                        .header("Authorization", "Bearer " + vendorToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(store.getId().toString()))
                .andExpect(jsonPath("$.vendorId").value("vendor-1"))
                .andExpect(jsonPath("$.name").value("Corner Market"));
    }

    @Test
    void updatesOwnedStoreAndRecordsProjectionEvent() throws Exception {
        Store store = storeRepository.save(new Store(
                "vendor-1", "Corner Market", "1 Main St", "New York", 40.7, -74.0
        ));

        mockMvc.perform(patch("/api/vendors/stores/" + store.getId())
                        .header("Authorization", "Bearer " + vendorToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Updated Market","address":"2 Main St","city":"Brooklyn","latitude":40.71,"longitude":-73.99}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Market"))
                .andExpect(jsonPath("$.city").value("Brooklyn"))
                .andExpect(jsonPath("$.latitude").value(40.71));

        org.assertj.core.api.Assertions.assertThat(projectionOutboxRepository.findAll())
                .anyMatch(event -> event.getStoreId().equals(store.getId()));
    }

    @Test
    void hidesStoreFromAnotherVendor() throws Exception {
        Store store = storeRepository.save(new Store(
                "vendor-1", "Private Market", "1 Main St", "New York", 40.7, -74.0
        ));

        mockMvc.perform(get("/api/vendors/stores/" + store.getId())
                        .header("Authorization", "Bearer " + vendorToken("vendor-2")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("STORE_NOT_FOUND"));
    }

    @Test
    void rejectsMalformedStoreId() throws Exception {
        mockMvc.perform(get("/api/vendors/stores/not-a-uuid")
                        .header("Authorization", "Bearer " + vendorToken()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void listsOnlyOwnedStoresWithPaginationMetadata() throws Exception {
        storeRepository.save(new Store("vendor-1", "First Market", "1 Main St", "New York", 40.7, -74.0));
        storeRepository.save(new Store("vendor-1", "Second Market", "2 Main St", "New York", 40.8, -74.1));
        storeRepository.save(new Store("vendor-2", "Other Market", "3 Main St", "New York", 40.9, -74.2));

        mockMvc.perform(get("/api/vendors/stores?page=0&size=1")
                        .header("Authorization", "Bearer " + vendorToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stores.length()").value(1))
                .andExpect(jsonPath("$.stores[0].vendorId").value("vendor-1"))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(1))
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.totalPages").value(2));
    }

    @Test
    void rejectsInvalidPagination() throws Exception {
        mockMvc.perform(get("/api/vendors/stores?page=-1&size=51")
                        .header("Authorization", "Bearer " + vendorToken()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_PAGINATION"));
    }

    @Test
    void rejectsUnauthenticatedStoreListing() throws Exception {
        mockMvc.perform(get("/api/vendors/stores"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void returnsPrivacySafePublicStoreSummary() throws Exception {
        Store store = storeRepository.save(new Store(
                "vendor-1", "Corner Market", "1 Main St", "New York", 40.7, -74.0
        ));

        mockMvc.perform(get("/api/vendors/stores/public/" + store.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(store.getId().toString()))
                .andExpect(jsonPath("$.name").value("Corner Market"))
                .andExpect(jsonPath("$.city").value("New York"))
                .andExpect(jsonPath("$.vendorId").doesNotExist())
                .andExpect(jsonPath("$.address").doesNotExist())
                .andExpect(jsonPath("$.latitude").doesNotExist())
                .andExpect(jsonPath("$.longitude").doesNotExist());
    }

    @Test
    void returnsProtectedProjectionDetailsWithLocation() throws Exception {
        Store store = storeRepository.save(new Store(
                "vendor-1", "Corner Market", "1 Main St", "New York", 40.7, -74.0
        ));

        mockMvc.perform(get("/api/vendors/stores/projection/" + store.getId())
                        .header("X-Projection-Token", "local-development-projection-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(store.getId().toString()))
                .andExpect(jsonPath("$.name").value("Corner Market"))
                .andExpect(jsonPath("$.city").value("New York"))
                .andExpect(jsonPath("$.latitude").value(40.7))
                .andExpect(jsonPath("$.longitude").value(-74.0))
                .andExpect(jsonPath("$.address").doesNotExist())
                .andExpect(jsonPath("$.vendorId").doesNotExist());
    }

    @Test
    void rejectsInvalidProjectionToken() throws Exception {
        Store store = storeRepository.save(new Store(
                "vendor-1", "Corner Market", "1 Main St", "New York", 40.7, -74.0
        ));

        mockMvc.perform(get("/api/vendors/stores/projection/" + store.getId())
                        .header("X-Projection-Token", "wrong-token"))
                .andExpect(status().isUnauthorized());
    }

    private String vendorToken() throws Exception {
        return vendorToken("vendor-1");
    }

    private String vendorToken(String vendorId) throws Exception {
        String header = encode("{\"alg\":\"HS256\",\"typ\":\"JWT\"}");
        String payload = encode("{\"sub\":\"" + vendorId + "\",\"role\":\"VENDOR\"}");
        String signingInput = header + "." + payload;
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec("test-secret".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String signature = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(mac.doFinal(signingInput.getBytes(StandardCharsets.UTF_8)));
        return signingInput + "." + signature;
    }

    private String encode(String value) {
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }
}
