package com.dealnear.offer.category;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * An offer category managed by admins. {@code code} is the stable identifier stored on
 * offers and in discovery projections, so it never changes after creation; the slug,
 * name, icon, order, and enabled flag are editable.
 */
@Entity
@Table(name = "categories")
public class Category {
    @Id
    private UUID id;
    @Column(nullable = false, unique = true, updatable = false, length = 32)
    private String code;
    @Column(nullable = false, unique = true, length = 64)
    private String slug;
    @Column(nullable = false, length = 80)
    private String name;
    @Column(length = 500)
    private String description;
    @Column(length = 16)
    private String icon;
    @Column(name = "parent_id")
    private UUID parentId;
    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
    @Column(nullable = false)
    private boolean enabled;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Category() {
    }

    public Category(String code, String slug, String name, String description, String icon,
            UUID parentId, int sortOrder) {
        this.id = UUID.randomUUID();
        this.code = code;
        this.slug = slug;
        this.name = name;
        this.description = description;
        this.icon = icon;
        this.parentId = parentId;
        this.sortOrder = sortOrder;
        this.enabled = true;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public UUID getId() { return id; }
    public String getCode() { return code; }
    public String getSlug() { return slug; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public String getIcon() { return icon; }
    public UUID getParentId() { return parentId; }
    public int getSortOrder() { return sortOrder; }
    public boolean isEnabled() { return enabled; }
    public Instant getUpdatedAt() { return updatedAt; }

    void update(String slug, String name, String description, String icon, UUID parentId,
            Integer sortOrder, Boolean enabled) {
        if (slug != null) this.slug = slug;
        if (name != null) this.name = name;
        if (description != null) this.description = description.isBlank() ? null : description;
        if (icon != null) this.icon = icon.isBlank() ? null : icon;
        this.parentId = parentId;
        if (sortOrder != null) this.sortOrder = sortOrder;
        if (enabled != null) this.enabled = enabled;
        this.updatedAt = Instant.now();
    }
}
