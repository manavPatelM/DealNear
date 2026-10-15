package com.dealnear.discovery.api;

import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Discovery treats categories as opaque upper-case codes owned by offer-service,
 * so adding an offer category does not require a discovery deployment.
 */
final class DiscoveryCategories {
    static final String DEFAULT = "OTHER";
    private static final Pattern CODE = Pattern.compile("^[A-Z][A-Z_]{0,31}$");

    private DiscoveryCategories() {
    }

    /** Normalizes an optional query filter; blank means "no filter". */
    static String filter(String category) {
        if (category == null || category.isBlank()) {
            return null;
        }
        String normalized = category.trim().toUpperCase(Locale.ROOT);
        if (!CODE.matcher(normalized).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid category");
        }
        return normalized;
    }

    /** Projection events recorded before categories existed carry none; they are stored as OTHER. */
    static String projected(String category) {
        String normalized = filter(category);
        return normalized == null ? DEFAULT : normalized;
    }
}
