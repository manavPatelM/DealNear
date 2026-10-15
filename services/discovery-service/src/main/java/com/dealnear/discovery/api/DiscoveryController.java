package com.dealnear.discovery.api;

import jakarta.validation.Valid;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class DiscoveryController {
    private final JdbcTemplate jdbcTemplate;
    private final String projectionToken;

    public DiscoveryController(JdbcTemplate jdbcTemplate,
            @Value("${dealnear.projection-token}") String projectionToken) {
        this.jdbcTemplate = jdbcTemplate;
        this.projectionToken = projectionToken;
    }

    @GetMapping("/health")
    Map<String, String> health() {
        return Map.of("status", "ok", "service", "discovery-service", "version", "0.1.0");
    }

    @PostMapping("/api/discovery/projections/offers")
    void upsert(@Valid @RequestBody ProjectionOfferRequest request,
            @RequestHeader("X-Projection-Token") String token) {
        requireProjectionToken(token);
        validateCoordinates(request.latitude(), request.longitude());
        if (!request.endAt().isAfter(request.startAt())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid offer validity window");
        }
        jdbcTemplate.update("""
                INSERT INTO offer_projections
                    (offer_id, store_id, store_name, store_city, title, description,
                     start_at, end_at, created_at, location, projection_version, category, store_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?, ?, ?)
                ON CONFLICT (offer_id) DO UPDATE SET
                    store_id = EXCLUDED.store_id, store_name = EXCLUDED.store_name,
                    store_city = EXCLUDED.store_city, title = EXCLUDED.title,
                    description = EXCLUDED.description, start_at = EXCLUDED.start_at,
                    end_at = EXCLUDED.end_at, created_at = EXCLUDED.created_at,
                    location = EXCLUDED.location,
                    projection_version = EXCLUDED.projection_version,
                    category = EXCLUDED.category,
                    store_active = EXCLUDED.store_active
                WHERE EXCLUDED.projection_version >= offer_projections.projection_version
                """, request.offerId(), request.storeId(), request.storeName(), request.storeCity(),
                request.title(), request.description(),
                request.startAt().atOffset(ZoneOffset.UTC),
                request.endAt().atOffset(ZoneOffset.UTC),
                request.createdAt().atOffset(ZoneOffset.UTC),
                request.longitude(), request.latitude(),
                request.projectionVersion().atOffset(ZoneOffset.UTC),
                DiscoveryCategories.projected(request.category()),
                request.storeActiveOrDefault());
    }

    @DeleteMapping("/api/discovery/projections/offers")
    void remove(@Valid @RequestBody ProjectionOfferRemovalRequest request,
            @RequestHeader("X-Projection-Token") String token) {
        requireProjectionToken(token);
        jdbcTemplate.update("""
                DELETE FROM offer_projections
                WHERE offer_id = ?
                  AND projection_version <= ?
                """, request.offerId(), request.projectionVersion().atOffset(ZoneOffset.UTC));
    }

    @PostMapping("/api/discovery/projections/stores")
    void updateStore(@Valid @RequestBody ProjectionStoreRequest request,
            @RequestHeader("X-Projection-Token") String token) {
        requireProjectionToken(token);
        validateCoordinates(request.latitude(), request.longitude());
        jdbcTemplate.update("""
                UPDATE offer_projections
                SET store_name = ?, store_city = ?,
                    location = ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
                    store_active = ?,
                    projection_version = ?
                WHERE store_id = ?
                  AND projection_version <= ?
                """, request.storeName(), request.storeCity(), request.longitude(),
                request.latitude(), request.storeActiveOrDefault(),
                request.projectionVersion().atOffset(ZoneOffset.UTC),
                request.storeId(), request.projectionVersion().atOffset(ZoneOffset.UTC));
    }

    @GetMapping("/api/discovery/offers")
    DiscoveryPageResponse nearby(@RequestParam double latitude, @RequestParam double longitude,
            @RequestParam double radiusKm, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String category) {
        validateCoordinates(latitude, longitude);
        if (radiusKm <= 0 || radiusKm > 50) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid radius");
        }
        if (page < 0 || size < 1 || size > 50) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid pagination");
        }
        String categoryFilter = DiscoveryCategories.filter(category);
        long offset = (long) page * size;
        double radiusMeters = radiusKm * 1000;

        // Only a fixed SQL fragment is appended; the category value itself is always bound.
        String eligibility = """
                WHERE start_at <= CURRENT_TIMESTAMP AND end_at > CURRENT_TIMESTAMP
                  AND store_active
                  AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?)
                """ + (categoryFilter == null ? "" : "  AND category = ?\n");
        List<Object> filterArgs = new ArrayList<>(List.of(longitude, latitude, radiusMeters));
        if (categoryFilter != null) {
            filterArgs.add(categoryFilter);
        }
        List<Object> pageArgs = new ArrayList<>(List.of(longitude, latitude));
        pageArgs.addAll(filterArgs);
        pageArgs.add(size);
        pageArgs.add(offset);

        List<DiscoveryOfferResponse> offers = jdbcTemplate.query("""
                SELECT offer_id, store_id, store_name, store_city, title, description,
                       ST_Distance(location, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography) / 1000.0,
                       category, start_at, end_at
                FROM offer_projections
                """ + eligibility + """
                ORDER BY 7 ASC, created_at DESC, offer_id DESC
                LIMIT ? OFFSET ?
                """, (rs, row) -> new DiscoveryOfferResponse(
                        rs.getObject(1, java.util.UUID.class), rs.getObject(2, java.util.UUID.class),
                        rs.getString(3), rs.getString(4), rs.getString(5), rs.getString(6), rs.getDouble(7),
                        rs.getString(8),
                        rs.getObject(9, OffsetDateTime.class).toInstant(),
                        rs.getObject(10, OffsetDateTime.class).toInstant()),
                pageArgs.toArray());
        Long total = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM offer_projections\n" + eligibility,
                Long.class, filterArgs.toArray());
        int totalPages = (int) Math.ceil((double) total / size);
        return new DiscoveryPageResponse(offers, page, size, total, totalPages);
    }

    private void requireProjectionToken(String token) {
        // Constant-time comparison avoids leaking token prefixes through response timing.
        if (token == null || !java.security.MessageDigest.isEqual(
                projectionToken.getBytes(java.nio.charset.StandardCharsets.UTF_8),
                token.getBytes(java.nio.charset.StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid projection token");
        }
    }

    private void validateCoordinates(double latitude, double longitude) {
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid location");
        }
    }
}
