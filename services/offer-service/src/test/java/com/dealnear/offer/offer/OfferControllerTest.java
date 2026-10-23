package com.dealnear.offer.offer;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.dealnear.offer.ownership.StoreOwnershipVerifier;
import com.dealnear.offer.ownership.StoreSummary;
import com.dealnear.offer.ownership.StoreSummaryClient;
import com.dealnear.offer.outbox.OfferOutboxRepository;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;
import java.util.List;
import java.time.Instant;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OfferControllerTest {
    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private OfferRepository offerRepository;
    @Autowired
    private JdbcTemplate jdbcTemplate;
    @Autowired
    private OfferOutboxRepository offerOutboxRepository;
    @MockBean
    private StoreOwnershipVerifier storeOwnershipVerifier;
    @MockBean
    private StoreSummaryClient storeSummaryClient;
    @Autowired
    private com.dealnear.offer.moderation.OfferReportRepository reportRepository;
    @Autowired
    private com.dealnear.offer.category.CategoryRepository categoryRepository;

    @BeforeEach
    void clearOffers() {
        reportRepository.deleteAll();
        offerRepository.deleteAll();
        categoryRepository.deleteAll();
        // Tests run on H2 without Flyway, so seed the taxonomy the tests rely on.
        com.dealnear.offer.category.Category food = categoryRepository.save(
                new com.dealnear.offer.category.Category("FOOD_AND_DRINK", "food-cafes", "Food & Cafés", null, null, null, 10));
        categoryRepository.save(new com.dealnear.offer.category.Category("CAFES", "cafes", "Cafés", null, null, food.getId(), 10));
        for (String code : List.of("GROCERY", "FASHION", "OTHER")) {
            categoryRepository.save(new com.dealnear.offer.category.Category(
                    code, code.toLowerCase(), code, null, null, null, 20));
        }
        offerOutboxRepository.deleteAll();
        when(storeOwnershipVerifier.ownedStoreVerificationStatus(any(UUID.class), anyString()))
                .thenReturn(java.util.Optional.of("VERIFIED"));
        when(storeSummaryClient.findById(any(UUID.class)))
                .thenReturn(java.util.Optional.of(new StoreSummary(
                        UUID.fromString("11111111-1111-1111-1111-111111111111"),
                        "Corner Market",
                        "New York"
                )));
        when(storeSummaryClient.findByIds(any(List.class)))
                .thenAnswer(invocation -> ((List<UUID>) invocation.getArgument(0)).stream()
                        .collect(java.util.stream.Collectors.toMap(
                                id -> id,
                                id -> new StoreSummary(id, "Corner Market", "New York")
                        )));
    }

    @Test
    void createsDraftAfterOwnershipVerification() throws Exception {
        when(storeOwnershipVerifier.vendorOwnsStore(any(UUID.class), anyString())).thenReturn(true);
        mockMvc.perform(post("/api/offers")
                        .header("Authorization", "Bearer " + vendorToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"storeId":"11111111-1111-1111-1111-111111111111","title":"20% off","description":"Weekend offer","startAt":"2026-10-13T00:00:00Z","endAt":"2026-12-31T23:59:59Z"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.vendorId").value("vendor-1"))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.title").value("20% off"));
    }

    @Test
    void rejectsStoreVendorDoesNotOwn() throws Exception {
        when(storeOwnershipVerifier.vendorOwnsStore(any(UUID.class), anyString())).thenReturn(false);
        mockMvc.perform(post("/api/offers")
                        .header("Authorization", "Bearer " + vendorToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"storeId":"11111111-1111-1111-1111-111111111111","title":"20% off","description":"Weekend offer","startAt":"2026-10-13T00:00:00Z","endAt":"2026-12-31T23:59:59Z"}
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("STORE_NOT_FOUND"));
    }

    @Test
    void rejectsInvalidOfferInput() throws Exception {
        mockMvc.perform(post("/api/offers")
                        .header("Authorization", "Bearer " + vendorToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"storeId":"11111111-1111-1111-1111-111111111111","title":"","description":"","startAt":"2026-10-13T00:00:00Z","endAt":"2026-12-31T23:59:59Z"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void rejectsReversedOfferValidityWindow() throws Exception {
        when(storeOwnershipVerifier.vendorOwnsStore(any(UUID.class), anyString())).thenReturn(true);
        mockMvc.perform(post("/api/offers")
                        .header("Authorization", "Bearer " + vendorToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"storeId":"11111111-1111-1111-1111-111111111111","title":"20% off","description":"Weekend offer","startAt":"2026-12-31T23:59:59Z","endAt":"2026-10-13T00:00:00Z"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_OFFER_VALIDITY"));
    }

    @Test
    void retrievesOwnedOffer() throws Exception {
        Offer offer = offerRepository.save(new Offer(
                "vendor-1", UUID.fromString("11111111-1111-1111-1111-111111111111"),
                "20% off", "Weekend offer"
        ));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get(
                        "/api/offers/" + offer.getId())
                        .header("Authorization", "Bearer " + vendorToken("vendor-1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(offer.getId().toString()))
                .andExpect(jsonPath("$.vendorId").value("vendor-1"))
                .andExpect(jsonPath("$.status").value("DRAFT"));
    }

    @Test
    void doesNotRevealOfferOwnedByAnotherVendor() throws Exception {
        Offer offer = offerRepository.save(new Offer(
                "vendor-1", UUID.fromString("11111111-1111-1111-1111-111111111111"),
                "20% off", "Weekend offer"
        ));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get(
                        "/api/offers/" + offer.getId())
                        .header("Authorization", "Bearer " + vendorToken("vendor-2")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("OFFER_NOT_FOUND"));
    }

    @Test
    void listsOnlyOwnedOffersWithPaginationMetadata() throws Exception {
        offerRepository.save(new Offer(
                "vendor-1", UUID.randomUUID(), "Offer one", "Description one"));
        offerRepository.save(new Offer(
                "vendor-1", UUID.randomUUID(), "Offer two", "Description two"));
        offerRepository.save(new Offer(
                "vendor-1", UUID.randomUUID(), "Offer three", "Description three"));
        offerRepository.save(new Offer(
                "vendor-2", UUID.randomUUID(), "Other vendor offer", "Description"));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get(
                        "/api/offers?page=0&size=2")
                        .header("Authorization", "Bearer " + vendorToken("vendor-1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.offers.length()").value(2))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(2))
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.totalPages").value(2));
    }

    @Test
    void rejectsInvalidPagination() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get(
                        "/api/offers?page=-1&size=20")
                        .header("Authorization", "Bearer " + vendorToken("vendor-1")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_PAGINATION"));
    }

    @Test
    void rejectsMalformedOfferId() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get(
                        "/api/offers/not-a-uuid")
                        .header("Authorization", "Bearer " + vendorToken("vendor-1")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"));
    }

    @Test
    void updatesOwnedDraftOffer() throws Exception {
        Offer offer = offerRepository.save(new Offer(
                "vendor-1", UUID.fromString("11111111-1111-1111-1111-111111111111"),
                "Original title", "Original description"
        ));

        mockMvc.perform(patch("/api/offers/" + offer.getId())
                        .header("Authorization", "Bearer " + vendorToken("vendor-1"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Updated title","description":"Updated description"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(offer.getId().toString()))
                .andExpect(jsonPath("$.storeId").value("11111111-1111-1111-1111-111111111111"))
                .andExpect(jsonPath("$.title").value("Updated title"))
                .andExpect(jsonPath("$.description").value("Updated description"))
                .andExpect(jsonPath("$.status").value("DRAFT"));
    }

    @Test
    void doesNotAllowAnotherVendorToUpdateOffer() throws Exception {
        Offer offer = offerRepository.save(new Offer(
                "vendor-1", UUID.randomUUID(), "Original title", "Original description"
        ));

        mockMvc.perform(patch("/api/offers/" + offer.getId())
                        .header("Authorization", "Bearer " + vendorToken("vendor-2"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Updated title","description":"Updated description"}
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("OFFER_NOT_FOUND"));
    }

    @Test
    void rejectsInvalidDraftUpdate() throws Exception {
        Offer offer = offerRepository.save(new Offer(
                "vendor-1", UUID.randomUUID(), "Original title", "Original description"
        ));

        mockMvc.perform(patch("/api/offers/" + offer.getId())
                        .header("Authorization", "Bearer " + vendorToken("vendor-1"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"","description":""}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void recordsProjectionUpdateWhenPublishedOfferChanges() throws Exception {
        Offer offer = new Offer(
                "vendor-1", UUID.randomUUID(), "Original title", "Original description"
        );
        offer.publish();
        offerRepository.save(offer);

        mockMvc.perform(patch("/api/offers/" + offer.getId())
                        .header("Authorization", "Bearer " + vendorToken("vendor-1"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Updated title","description":"Updated description"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.title").value("Updated title"));

        org.assertj.core.api.Assertions.assertThat(offerOutboxRepository.findAll())
                .hasSize(1)
                .first()
                .extracting(event -> event.getEventType())
                .isEqualTo("offer.projection.updated.v1");
    }

    @Test
    void publishesOwnedDraftOffer() throws Exception {
        Offer offer = offerRepository.save(new Offer(
                "vendor-1", UUID.randomUUID(), "Draft title", "Draft description"
        ));

        mockMvc.perform(post("/api/offers/" + offer.getId() + "/publish")
                        .header("Authorization", "Bearer " + vendorToken("vendor-1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(offer.getId().toString()))
                .andExpect(jsonPath("$.status").value("PUBLISHED"));
        org.assertj.core.api.Assertions.assertThat(offerOutboxRepository.findAll())
                .hasSize(1)
                .first()
                .extracting(event -> event.getEventType())
                .isEqualTo("offer.projection.updated.v1");
    }

    @Test
    void publishingAlreadyPublishedOfferIsIdempotent() throws Exception {
        Offer offer = offerRepository.save(new Offer(
                "vendor-1", UUID.randomUUID(), "Draft title", "Draft description"
        ));

        mockMvc.perform(post("/api/offers/" + offer.getId() + "/publish")
                        .header("Authorization", "Bearer " + vendorToken("vendor-1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));
        org.assertj.core.api.Assertions.assertThat(offerOutboxRepository.findAll()).hasSize(1);

        mockMvc.perform(post("/api/offers/" + offer.getId() + "/publish")
                        .header("Authorization", "Bearer " + vendorToken("vendor-1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));
    }

    @Test
    void unpublishesPublishedOfferAndRecordsRemoval() throws Exception {
        Offer offer = new Offer("vendor-1", UUID.randomUUID(), "Published", "Offer");
        offer.publish();
        offerRepository.save(offer);

        mockMvc.perform(post("/api/offers/" + offer.getId() + "/unpublish")
                        .header("Authorization", "Bearer " + vendorToken("vendor-1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DRAFT"));

        org.assertj.core.api.Assertions.assertThat(offerOutboxRepository.findAll())
                .hasSize(1)
                .first()
                .extracting(event -> event.getEventType())
                .isEqualTo("offer.projection.removed.v1");
    }

    @Test
    void deletesPublishedOfferAndRecordsRemoval() throws Exception {
        Offer offer = new Offer("vendor-1", UUID.randomUUID(), "Published", "Offer");
        offer.publish();
        offerRepository.save(offer);

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete(
                        "/api/offers/" + offer.getId())
                        .header("Authorization", "Bearer " + vendorToken("vendor-1")))
                .andExpect(status().isNoContent());

        org.assertj.core.api.Assertions.assertThat(offerRepository.findById(offer.getId())).isEmpty();
        org.assertj.core.api.Assertions.assertThat(offerOutboxRepository.findAll())
                .hasSize(1)
                .first()
                .extracting(event -> event.getEventType())
                .isEqualTo("offer.projection.removed.v1");
    }

    @Test
    void rejectsPublishingExpiredOffer() throws Exception {
        Offer offer = offerRepository.save(new Offer(
                "vendor-1", UUID.randomUUID(), "Expired", "Expired offer",
                Instant.parse("2026-10-01T00:00:00Z"),
                Instant.parse("2026-10-02T00:00:00Z")
        ));

        mockMvc.perform(post("/api/offers/" + offer.getId() + "/publish")
                        .header("Authorization", "Bearer " + vendorToken()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_OFFER_VALIDITY"));
    }

    @Test
    void doesNotAllowAnotherVendorToPublishOffer() throws Exception {
        Offer offer = offerRepository.save(new Offer(
                "vendor-1", UUID.randomUUID(), "Draft title", "Draft description"
        ));

        mockMvc.perform(post("/api/offers/" + offer.getId() + "/publish")
                        .header("Authorization", "Bearer " + vendorToken("vendor-2")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("OFFER_NOT_FOUND"));
    }

    @Test
    void publiclyReadsPublishedOfferWithoutAuthentication() throws Exception {
        Offer offer = new Offer(
                "vendor-1", UUID.randomUUID(), "Public title", "Public description"
        );
        offerRepository.save(offer);
        jdbcTemplate.update("update offers set status = 'PUBLISHED' where id = ?", offer.getId());

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get(
                        "/api/offers/public/" + offer.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(offer.getId().toString()))
                .andExpect(jsonPath("$.storeId").value(offer.getStoreId().toString()))
                .andExpect(jsonPath("$.storeName").value("Corner Market"))
                .andExpect(jsonPath("$.storeCity").value("New York"))
                .andExpect(jsonPath("$.title").value("Public title"))
                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.vendorId").doesNotExist());
    }

    @Test
    void doesNotPubliclyReadDraftOffer() throws Exception {
        Offer offer = offerRepository.save(new Offer(
                "vendor-1", UUID.randomUUID(), "Draft title", "Draft description"
        ));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get(
                        "/api/offers/public/" + offer.getId()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("OFFER_NOT_FOUND"));
    }

    @Test
    void doesNotPubliclyReadExpiredPublishedOffer() throws Exception {
        Offer offer = new Offer(
                "vendor-1", UUID.randomUUID(), "Expired title", "Expired description",
                Instant.parse("2026-10-01T00:00:00Z"),
                Instant.parse("2026-10-02T00:00:00Z")
        );
        offerRepository.save(offer);
        jdbcTemplate.update("update offers set status = 'PUBLISHED' where id = ?", offer.getId());

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get(
                        "/api/offers/public/" + offer.getId()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("OFFER_NOT_FOUND"));
    }

    @Test
    void publiclyListsOnlyPublishedOffersWithPaginationMetadata() throws Exception {
        Offer publishedOne = new Offer(
                "vendor-1", UUID.randomUUID(), "Published one", "Description one");
        publishedOne.publish();
        offerRepository.save(publishedOne);

        Offer publishedTwo = new Offer(
                "vendor-2", UUID.randomUUID(), "Published two", "Description two");
        publishedTwo.publish();
        offerRepository.save(publishedTwo);

        offerRepository.save(new Offer(
                "vendor-3", UUID.randomUUID(), "Draft offer", "Draft description"));
        Offer expired = new Offer(
                "vendor-4", UUID.randomUUID(), "Expired offer", "Expired description",
                Instant.parse("2026-10-01T00:00:00Z"),
                Instant.parse("2026-10-02T00:00:00Z")
        );
        offerRepository.save(expired);
        jdbcTemplate.update("update offers set status = 'PUBLISHED' where id = ?", expired.getId());

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get(
                        "/api/offers/public?page=0&size=1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.offers.length()").value(1))
                .andExpect(jsonPath("$.offers[0].status").value("PUBLISHED"))
                .andExpect(jsonPath("$.offers[0].storeName").value("Corner Market"))
                .andExpect(jsonPath("$.offers[0].storeCity").value("New York"))
                .andExpect(jsonPath("$.offers[0].vendorId").doesNotExist())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(1))
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.totalPages").value(2));
    }

    @Test
    void rejectsInvalidPublicPagination() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get(
                        "/api/offers/public?page=0&size=51"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_PAGINATION"));
    }

    // ── DN-034 categories ───────────────────────────────────────────────

    @Test
    void createsOfferWithCategoryAndDefaultsMissingCategoryToOther() throws Exception {
        when(storeOwnershipVerifier.vendorOwnsStore(any(UUID.class), anyString())).thenReturn(true);
        mockMvc.perform(post("/api/offers")
                        .header("Authorization", "Bearer " + vendorToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"storeId":"11111111-1111-1111-1111-111111111111","title":"Coffee","description":"2 for 1","startAt":"2026-10-13T00:00:00Z","endAt":"2030-12-31T23:59:59Z","category":"FOOD_AND_DRINK"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.category").value("FOOD_AND_DRINK"));
        mockMvc.perform(post("/api/offers")
                        .header("Authorization", "Bearer " + vendorToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"storeId":"11111111-1111-1111-1111-111111111111","title":"Misc","description":"Thing","startAt":"2026-10-13T00:00:00Z","endAt":"2030-12-31T23:59:59Z"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.category").value("OTHER"));
    }

    @Test
    void rejectsUnknownCategoryAsInvalidRequest() throws Exception {
        when(storeOwnershipVerifier.vendorOwnsStore(any(UUID.class), anyString())).thenReturn(true);
        mockMvc.perform(post("/api/offers")
                        .header("Authorization", "Bearer " + vendorToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"storeId":"11111111-1111-1111-1111-111111111111","title":"X","description":"Y","startAt":"2026-10-13T00:00:00Z","endAt":"2030-12-31T23:59:59Z","category":"WEAPONS"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_CATEGORY"));
    }

    @Test
    void publicListingFiltersByCategoryStoreAndIds() throws Exception {
        UUID storeA = UUID.randomUUID();
        Offer food = publishedOffer(storeA, "FOOD_AND_DRINK");
        Offer grocery = publishedOffer(storeA, "GROCERY");
        Offer elsewhere = publishedOffer(UUID.randomUUID(), "GROCERY");

        mockMvc.perform(get("/api/offers/public?category=GROCERY"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.offers[0].category").value("GROCERY"));
        mockMvc.perform(get("/api/offers/public?storeId=" + storeA))
                .andExpect(jsonPath("$.totalElements").value(2));
        mockMvc.perform(get("/api/offers/public?ids=" + food.getId() + "," + elsewhere.getId()))
                .andExpect(jsonPath("$.totalElements").value(2));
        mockMvc.perform(get("/api/offers/public?category=GROCERY&storeId=" + storeA))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.offers[0].id").value(grocery.getId().toString()));
        mockMvc.perform(get("/api/offers/public?category=NOPE"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_CATEGORY"));
    }

    @Test
    void publicListingHidesOffersWhoseStoreHasNoPublicSummary() throws Exception {
        UUID hiddenStore = UUID.randomUUID();
        publishedOffer(hiddenStore, "OTHER");
        publishedOffer(UUID.randomUUID(), "OTHER");
        when(storeSummaryClient.findByIds(any(List.class)))
                .thenAnswer(invocation -> ((List<UUID>) invocation.getArgument(0)).stream()
                        .filter(id -> !id.equals(hiddenStore))
                        .collect(java.util.stream.Collectors.toMap(
                                id -> id, id -> new StoreSummary(id, "Corner Market", "New York"))));

        mockMvc.perform(get("/api/offers/public"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.offers.length()").value(1));
    }

    @Test
    void publishingProjectionEventCarriesCategory() throws Exception {
        Offer offer = offerRepository.save(new Offer("vendor-1", UUID.randomUUID(), "T", "D",
                Instant.now(), Instant.now().plusSeconds(3600), "FASHION"));

        mockMvc.perform(post("/api/offers/" + offer.getId() + "/publish")
                        .header("Authorization", "Bearer " + vendorToken()))
                .andExpect(status().isOk());

        org.assertj.core.api.Assertions.assertThat(offerOutboxRepository.findAll())
                .anySatisfy(event -> org.assertj.core.api.Assertions.assertThat(event.getPayload())
                        .contains("\"category\":\"FASHION\""));
    }

    // ── DN-035 lifecycle ───────────────────────────────────────────────

    @Test
    void pausesAndResumesPublishedOfferWithProjectionEvents() throws Exception {
        Offer offer = publishedOffer(UUID.randomUUID(), "OTHER");

        mockMvc.perform(post("/api/offers/" + offer.getId() + "/pause")
                        .header("Authorization", "Bearer " + vendorToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAUSED"));
        mockMvc.perform(get("/api/offers/public/" + offer.getId()))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/offers/" + offer.getId() + "/resume")
                        .header("Authorization", "Bearer " + vendorToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));

        org.assertj.core.api.Assertions.assertThat(offerOutboxRepository.findAll())
                .extracting(com.dealnear.offer.outbox.OfferOutboxEvent::getEventType)
                .containsExactlyInAnyOrder("offer.projection.removed.v1", "offer.projection.updated.v1");
    }

    @Test
    void rejectsInvalidLifecycleTransitions() throws Exception {
        Offer draft = offerRepository.save(new Offer("vendor-1", UUID.randomUUID(), "T", "D"));

        mockMvc.perform(post("/api/offers/" + draft.getId() + "/pause")
                        .header("Authorization", "Bearer " + vendorToken()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("INVALID_OFFER_TRANSITION"));
        mockMvc.perform(post("/api/offers/" + draft.getId() + "/resume")
                        .header("Authorization", "Bearer " + vendorToken()))
                .andExpect(status().isConflict());
    }

    @Test
    void expiresOfferEarlyAndBlocksFurtherChanges() throws Exception {
        Offer offer = publishedOffer(UUID.randomUUID(), "OTHER");

        mockMvc.perform(post("/api/offers/" + offer.getId() + "/expire")
                        .header("Authorization", "Bearer " + vendorToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EXPIRED"))
                .andExpect(jsonPath("$.expired").value(true));
        org.assertj.core.api.Assertions.assertThat(offerRepository.findById(offer.getId()).orElseThrow()
                .getEndAt()).isBeforeOrEqualTo(Instant.now());
        org.assertj.core.api.Assertions.assertThat(offerOutboxRepository.findAll())
                .extracting(com.dealnear.offer.outbox.OfferOutboxEvent::getEventType)
                .containsExactly("offer.projection.removed.v1");

        mockMvc.perform(post("/api/offers/" + offer.getId() + "/publish")
                        .header("Authorization", "Bearer " + vendorToken()))
                .andExpect(status().isConflict());
        mockMvc.perform(patch("/api/offers/" + offer.getId())
                        .header("Authorization", "Bearer " + vendorToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"New\",\"description\":\"New\"}"))
                .andExpect(status().isConflict());
    }

    // ── DN-037 store verification gate ─────────────────────────────────

    @Test
    void refusesToPublishOfferForUnverifiedStore() throws Exception {
        when(storeOwnershipVerifier.ownedStoreVerificationStatus(any(UUID.class), anyString()))
                .thenReturn(java.util.Optional.of("PENDING"));
        Offer offer = offerRepository.save(new Offer("vendor-1", UUID.randomUUID(), "T", "D"));

        mockMvc.perform(post("/api/offers/" + offer.getId() + "/publish")
                        .header("Authorization", "Bearer " + vendorToken()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("STORE_NOT_VERIFIED"));
        org.assertj.core.api.Assertions.assertThat(offerRepository.findById(offer.getId()).orElseThrow()
                .getStatus()).isEqualTo(Offer.Status.DRAFT);
        org.assertj.core.api.Assertions.assertThat(offerOutboxRepository.count()).isZero();
    }

    // ── DN-038 reports and moderation ──────────────────────────────────

    @Test
    void customerReportsLiveOfferOnceAndAdminSeesItInQueue() throws Exception {
        Offer offer = publishedOffer(UUID.randomUUID(), "OTHER");
        String report = "{\"reason\":\"MISLEADING\",\"details\":\"Price is wrong\"}";

        mockMvc.perform(post("/api/offers/" + offer.getId() + "/reports")
                        .header("Authorization", "Bearer " + customerToken())
                        .contentType(MediaType.APPLICATION_JSON).content(report))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.reporterId").doesNotExist());
        mockMvc.perform(post("/api/offers/" + offer.getId() + "/reports")
                        .header("Authorization", "Bearer " + customerToken())
                        .contentType(MediaType.APPLICATION_JSON).content(report))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/offers/admin/reports")
                        .header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.reports[0].details").value("Price is wrong"))
                .andExpect(jsonPath("$.reports[0].offer.title").value(offer.getTitle()));
    }

    @Test
    void cannotReportDraftOffersAndOnlyCustomersCanReport() throws Exception {
        Offer draft = offerRepository.save(new Offer("vendor-1", UUID.randomUUID(), "T", "D"));
        mockMvc.perform(post("/api/offers/" + draft.getId() + "/reports")
                        .header("Authorization", "Bearer " + customerToken())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"SPAM\"}"))
                .andExpect(status().isNotFound());
        mockMvc.perform(post("/api/offers/" + draft.getId() + "/reports")
                        .header("Authorization", "Bearer " + vendorToken())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"SPAM\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminRemovesReportedOfferAndClosesOpenReports() throws Exception {
        Offer offer = publishedOffer(UUID.randomUUID(), "OTHER");
        mockMvc.perform(post("/api/offers/" + offer.getId() + "/reports")
                .header("Authorization", "Bearer " + customerToken())
                .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"INAPPROPRIATE\"}"));

        mockMvc.perform(post("/api/offers/admin/offers/" + offer.getId() + "/remove")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Violates content policy\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REMOVED"))
                .andExpect(jsonPath("$.moderationNote").value("Violates content policy"));

        mockMvc.perform(get("/api/offers/public/" + offer.getId())).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/offers/admin/reports?status=ACTIONED")
                        .header("Authorization", "Bearer " + adminToken()))
                .andExpect(jsonPath("$.totalElements").value(1));
        mockMvc.perform(post("/api/offers/" + offer.getId() + "/publish")
                        .header("Authorization", "Bearer " + vendorToken()))
                .andExpect(status().isConflict());
        org.assertj.core.api.Assertions.assertThat(offerOutboxRepository.findAll())
                .extracting(com.dealnear.offer.outbox.OfferOutboxEvent::getEventType)
                .containsExactly("offer.projection.removed.v1");
    }

    @Test
    void adminDismissesReportOnce() throws Exception {
        Offer offer = publishedOffer(UUID.randomUUID(), "OTHER");
        String body = mockMvc.perform(post("/api/offers/" + offer.getId() + "/reports")
                        .header("Authorization", "Bearer " + customerToken())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"OTHER\"}"))
                .andReturn().getResponse().getContentAsString();
        String reportId = body.replaceAll(".*\"id\":\"([^\"]+)\".*", "$1");

        mockMvc.perform(post("/api/offers/admin/reports/" + reportId + "/dismiss")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"note\":\"Looks fine\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DISMISSED"));
        mockMvc.perform(post("/api/offers/admin/reports/" + reportId + "/dismiss")
                        .header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("REPORT_ALREADY_RESOLVED"));
    }

    @Test
    void nonAdminsCannotModerate() throws Exception {
        mockMvc.perform(get("/api/offers/admin/reports")
                        .header("Authorization", "Bearer " + vendorToken()))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/offers")
                        .header("Authorization", "Bearer " + customerToken()))
                .andExpect(status().isForbidden());
    }

    // ── DN-041 category taxonomy ───────────────────────────────────────

    @Test
    void publicCategoryListShowsEnabledCategoriesWithParents() throws Exception {
        mockMvc.perform(get("/api/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.categories[?(@.code == 'CAFES')].parentCode").value("FOOD_AND_DRINK"))
                .andExpect(jsonPath("$.categories[?(@.code == 'FOOD_AND_DRINK')].slug").value("food-cafes"));
    }

    @Test
    void parentCategoryFilterIncludesSubcategoryOffers() throws Exception {
        publishedOffer(UUID.randomUUID(), "CAFES");
        publishedOffer(UUID.randomUUID(), "FOOD_AND_DRINK");
        publishedOffer(UUID.randomUUID(), "GROCERY");

        mockMvc.perform(get("/api/offers/public?category=FOOD_AND_DRINK"))
                .andExpect(jsonPath("$.totalElements").value(2));
        mockMvc.perform(get("/api/offers/public?category=cafes"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void adminCreatesEditsAndDisablesCategory() throws Exception {
        String body = mockMvc.perform(post("/api/categories")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"code":"pet_care","slug":"pet-care","name":"Pet Care","icon":"🐾","sortOrder":5,"parentCode":""}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("PET_CARE"))
                .andReturn().getResponse().getContentAsString();
        String id = body.replaceAll(".*\"id\":\"([^\"]+)\".*", "$1");

        mockMvc.perform(patch("/api/categories/" + id)
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Pets\",\"enabled\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Pets"))
                .andExpect(jsonPath("$.enabled").value(false));

        mockMvc.perform(get("/api/categories"))
                .andExpect(jsonPath("$.categories[?(@.code == 'PET_CARE')]").isEmpty());
        mockMvc.perform(get("/api/categories/admin").header("Authorization", "Bearer " + adminToken()))
                .andExpect(jsonPath("$.categories[?(@.code == 'PET_CARE')].enabled").value(false));
    }

    @Test
    void vendorsCannotAssignDisabledCategories() throws Exception {
        com.dealnear.offer.category.Category retired = categoryRepository.save(
                new com.dealnear.offer.category.Category("RETIRED", "retired", "Retired", null, null, null, 1));
        mockMvc.perform(patch("/api/categories/" + retired.getId())
                .header("Authorization", "Bearer " + adminToken())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"enabled\":false}"));
        when(storeOwnershipVerifier.vendorOwnsStore(any(UUID.class), anyString())).thenReturn(true);

        mockMvc.perform(post("/api/offers")
                        .header("Authorization", "Bearer " + vendorToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"storeId":"11111111-1111-1111-1111-111111111111","title":"X","description":"Y","startAt":"2026-10-13T00:00:00Z","endAt":"2030-12-31T23:59:59Z","category":"RETIRED"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_CATEGORY"));
    }

    @Test
    void rejectsDuplicateCategoriesAndDeepNesting() throws Exception {
        mockMvc.perform(post("/api/categories")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"GROCERY\",\"slug\":\"grocery-2\",\"name\":\"Dup\"}"))
                .andExpect(status().isConflict());
        mockMvc.perform(post("/api/categories")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"ESPRESSO\",\"slug\":\"espresso\",\"name\":\"Espresso\",\"parentCode\":\"CAFES\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_CATEGORY"));
        mockMvc.perform(post("/api/categories")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"BAD\",\"slug\":\"Not A Slug\",\"name\":\"Bad\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void onlyAdminsManageCategories() throws Exception {
        mockMvc.perform(post("/api/categories")
                        .header("Authorization", "Bearer " + vendorToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"X_Y\",\"slug\":\"x-y\",\"name\":\"X\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"X_Y\",\"slug\":\"x-y\",\"name\":\"X\"}"))
                .andExpect(status().isUnauthorized());
    }

    private Offer publishedOffer(UUID storeId, String category) {
        Offer offer = new Offer("vendor-1", storeId, "Offer " + category, "Description",
                Instant.now().minusSeconds(60), Instant.now().plusSeconds(3600), category);
        offer.publish();
        return offerRepository.save(offer);
    }

    private String customerToken() throws Exception {
        return token("customer-1", "CUSTOMER", Instant.now().plusSeconds(3600).getEpochSecond());
    }

    private String adminToken() throws Exception {
        return token("admin-1", "ADMIN", Instant.now().plusSeconds(3600).getEpochSecond());
    }

    @Test
    void rejectsExpiredVendorToken() throws Exception {
        String expired = token("vendor-1", "VENDOR", java.time.Instant.now().minusSeconds(5).getEpochSecond());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/offers")
                        .header("Authorization", "Bearer " + expired))
                .andExpect(status().isUnauthorized());
    }

    private String vendorToken() throws Exception {
        return vendorToken("vendor-1");
    }

    private String vendorToken(String vendorId) throws Exception {
        return token(vendorId, "VENDOR", java.time.Instant.now().plusSeconds(3600).getEpochSecond());
    }

    static String token(String subject, String role, long expiresAtEpochSecond) throws Exception {
        String header = encode("{\"alg\":\"HS256\",\"typ\":\"JWT\"}");
        String payload = encode("{\"sub\":\"" + subject + "\",\"role\":\"" + role
                + "\",\"exp\":" + expiresAtEpochSecond + "}");
        String signingInput = header + "." + payload;
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec("test-secret".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return signingInput + "." + Base64.getUrlEncoder().withoutPadding()
                .encodeToString(mac.doFinal(signingInput.getBytes(StandardCharsets.UTF_8)));
    }

    static String encode(String value) {
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }
}
