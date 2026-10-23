package com.dealnear.offer.category;

import java.util.Map;
import java.util.UUID;

public record CategoryResponse(
        UUID id,
        String code,
        String slug,
        String name,
        String description,
        String icon,
        String parentCode,
        int sortOrder,
        boolean enabled
) {
    static CategoryResponse from(Category category, Map<UUID, Category> byId) {
        Category parent = category.getParentId() == null ? null : byId.get(category.getParentId());
        return new CategoryResponse(category.getId(), category.getCode(), category.getSlug(), category.getName(),
                category.getDescription(), category.getIcon(), parent == null ? null : parent.getCode(),
                category.getSortOrder(), category.isEnabled());
    }
}
