package com.dealnear.offer.ownership;

import java.util.UUID;

public record StoreSummary(
        UUID id,
        String name,
        String city
) {
}
