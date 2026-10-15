package com.dealnear.identity.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import static org.assertj.core.api.Assertions.assertThat;

import com.dealnear.identity.user.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import com.dealnear.identity.savedoffer.SavedOfferRepository;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
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
class AuthControllerTest {
    @Autowired MockMvc mockMvc;
    @Autowired UserRepository users;
    @Autowired SavedOfferRepository savedOffers;

    @BeforeEach
    void clearUsers() {
        savedOffers.deleteAll();
        users.deleteAll();
        users.save(new com.dealnear.identity.user.User("admin@example.com",
                new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode("test-admin-password"),
                "ADMIN"));
    }

    @Test
    void bootstrapAdminCanSignInAndReadProfile() throws Exception {
        String token = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"admin@example.com","password":"test-admin-password"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andReturn().getResponse().getContentAsString()
                .replaceAll(".*\"accessToken\":\"([^\"]+)\".*", "$1");

        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"));
    }

    @Test
    void adminCannotUseCustomerSavedOffers() throws Exception {
        String userId = users.findByEmailIgnoreCase("admin@example.com").orElseThrow().getId().toString();
        String token = signedToken("{\"sub\":\"" + userId + "\",\"role\":\"ADMIN\",\"exp\":"
                + Instant.now().plusSeconds(60).getEpochSecond() + "}");

        mockMvc.perform(get("/api/auth/saved-offers").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void registrationCannotCreateAdminAccounts() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"sneaky@example.com","password":"strong-password","role":"ADMIN"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("CUSTOMER"));
    }

    @Test
    void adminBootstrapCreatesAdminOnceAndRejectsWeakPasswords() {
        var bootstrap = new com.dealnear.identity.user.AdminBootstrap(users, "Boot@Example.com", "long-enough-password");
        bootstrap.run(null);
        bootstrap.run(null);

        assertThat(users.findAll().stream().filter(u -> u.getEmail().equals("boot@example.com")).count()).isEqualTo(1);
        assertThat(users.findByEmailIgnoreCase("boot@example.com").orElseThrow().getRole()).isEqualTo("ADMIN");
        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
                new com.dealnear.identity.user.AdminBootstrap(users, "weak@example.com", "short").run(null))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void registersCustomerAndReturnsToken() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"customer@example.com","password":"strong-password"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("customer@example.com"))
                .andExpect(jsonPath("$.role").value("CUSTOMER"))
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.expiresAt").isNotEmpty());
    }

    @Test
    void issuesTokenWithFutureExpiryClaim() throws Exception {
        long before = Instant.now().getEpochSecond();
        String token = registerAndGetToken("customer@example.com");

        JsonNode claims = new ObjectMapper().readTree(Base64.getUrlDecoder().decode(token.split("\\.")[1]));
        assertThat(claims.path("exp").asLong()).isBetween(before + 3500, before + 3700);
        assertThat(claims.path("iat").asLong()).isGreaterThanOrEqualTo(before);
    }

    @Test
    void rejectsExpiredToken() throws Exception {
        String userId = users.save(new com.dealnear.identity.user.User(
                "expired@example.com", "unused-hash", "CUSTOMER")).getId().toString();
        String expired = signedToken("{\"sub\":\"" + userId + "\",\"role\":\"CUSTOMER\",\"exp\":"
                + Instant.now().minusSeconds(5).getEpochSecond() + "}");

        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + expired))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsTokenWithoutExpiryClaim() throws Exception {
        String userId = users.save(new com.dealnear.identity.user.User(
                "noexp@example.com", "unused-hash", "CUSTOMER")).getId().toString();
        String withoutExpiry = signedToken("{\"sub\":\"" + userId + "\",\"role\":\"CUSTOMER\"}");

        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + withoutExpiry))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logsInWithRegisteredCredentials() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"customer@example.com","password":"strong-password"}
                        """));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"customer@example.com","password":"strong-password"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("CUSTOMER"))
                .andExpect(jsonPath("$.accessToken").isNotEmpty());
    }

    @Test
    void rejectsInvalidCredentials() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"missing@example.com","password":"wrong-password"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void returnsCustomerProfileForValidToken() throws Exception {
        String token = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"customer@example.com","password":"strong-password"}
                                """))
                .andReturn().getResponse().getContentAsString()
                .replaceAll(".*\"accessToken\":\"([^\"]+)\".*", "$1");

        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("customer@example.com"))
                .andExpect(jsonPath("$.role").value("CUSTOMER"));
    }

    @Test
    void registersVendorAndReturnsVendorRoleToken() throws Exception {
        mockMvc.perform(post("/api/auth/register/vendor")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"vendor@example.com","password":"strong-password"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("vendor@example.com"))
                .andExpect(jsonPath("$.role").value("VENDOR"))
                .andExpect(jsonPath("$.accessToken").isNotEmpty());
    }

    @Test
    void returnsVendorProfileForVendorToken() throws Exception {
        String token = mockMvc.perform(post("/api/auth/register/vendor")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"vendor@example.com","password":"strong-password"}
                                """))
                .andReturn().getResponse().getContentAsString()
                .replaceAll(".*\"accessToken\":\"([^\"]+)\".*", "$1");

        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("vendor@example.com"))
                .andExpect(jsonPath("$.role").value("VENDOR"));
    }

    @Test
    void rejectsUnauthenticatedProfileRequest() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void savesListsAndUnsavesOfferIdempotently() throws Exception {
        String token = registerAndGetToken("customer@example.com");
        UUID offerId = UUID.randomUUID();

        mockMvc.perform(post("/api/auth/saved-offers/" + offerId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.offerId").value(offerId.toString()));

        mockMvc.perform(post("/api/auth/saved-offers/" + offerId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/auth/saved-offers")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.savedOffers.length()").value(1))
                .andExpect(jsonPath("$.savedOffers[0].offerId").value(offerId.toString()));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/api/auth/saved-offers/" + offerId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/auth/saved-offers")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.savedOffers.length()").value(0));
    }

    @Test
    void rejectsUnauthenticatedSavedOfferRequest() throws Exception {
        mockMvc.perform(get("/api/auth/saved-offers"))
                .andExpect(status().isUnauthorized());
    }

    static String signedToken(String payloadJson) throws Exception {
        Base64.Encoder encoder = Base64.getUrlEncoder().withoutPadding();
        String input = encoder.encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8))
                + "." + encoder.encodeToString(payloadJson.getBytes(StandardCharsets.UTF_8));
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec("test-secret".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return input + "." + encoder.encodeToString(mac.doFinal(input.getBytes(StandardCharsets.UTF_8)));
    }

    private String registerAndGetToken(String email) throws Exception {
        return mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"strong-password"}
                                """.formatted(email)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString()
                .replaceAll(".*\"accessToken\":\"([^\"]+)\".*", "$1");
    }
}
