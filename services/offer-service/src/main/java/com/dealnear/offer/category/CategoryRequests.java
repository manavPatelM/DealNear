package com.dealnear.offer.category;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class CategoryRequests {
    static final String CODE = "^[A-Za-z][A-Za-z_]{1,31}$";
    static final String SLUG = "^[a-z0-9]+(-[a-z0-9]+)*$";

    private CategoryRequests() {
    }

    public record Create(
            @NotBlank @Pattern(regexp = CODE) String code,
            @NotBlank @Size(max = 64) @Pattern(regexp = SLUG) String slug,
            @NotBlank @Size(max = 80) String name,
            @Size(max = 500) String description,
            @Size(max = 16) String icon,
            /** Empty or missing means a top-level category. */
            @Pattern(regexp = "^$|" + CODE) String parentCode,
            @Min(0) @Max(100000) Integer sortOrder
    ) {
    }

    /** All fields optional. An empty parentCode moves a subcategory to the top level. */
    public record Update(
            @Size(max = 64) @Pattern(regexp = SLUG) String slug,
            @Size(min = 1, max = 80) String name,
            @Size(max = 500) String description,
            @Size(max = 16) String icon,
            @Pattern(regexp = "^$|" + CODE) String parentCode,
            @Min(0) @Max(100000) Integer sortOrder,
            Boolean enabled
    ) {
    }
}
