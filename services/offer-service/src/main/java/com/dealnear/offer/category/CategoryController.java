package com.dealnear.offer.category;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {
    private final CategoryService categories;

    public CategoryController(CategoryService categories) {
        this.categories = categories;
    }

    /** Public taxonomy for navigation, filters, and the vendor offer form. */
    @GetMapping
    public CategoryListResponse list() {
        return new CategoryListResponse(categories.publicCategories());
    }

    /** Includes disabled categories, for the admin category manager. */
    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public CategoryListResponse listAll() {
        return new CategoryListResponse(categories.allCategories());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public CategoryResponse create(@Valid @RequestBody CategoryRequests.Create request) {
        return categories.create(request);
    }

    /** Edits a category. Categories are disabled rather than deleted so existing offers keep a valid code. */
    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public CategoryResponse update(@PathVariable UUID id, @Valid @RequestBody CategoryRequests.Update request) {
        return categories.update(id, request);
    }

    public record CategoryListResponse(List<CategoryResponse> categories) {
    }
}
