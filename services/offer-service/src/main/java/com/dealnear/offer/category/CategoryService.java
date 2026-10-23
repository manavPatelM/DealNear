package com.dealnear.offer.category;

import com.dealnear.offer.category.CategoryExceptions.CategoryConflictException;
import com.dealnear.offer.category.CategoryExceptions.CategoryNotFoundException;
import com.dealnear.offer.category.CategoryExceptions.InvalidCategoryException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CategoryService {
    public static final String DEFAULT_CODE = "OTHER";

    private final CategoryRepository repository;

    public CategoryService(CategoryRepository repository) {
        this.repository = repository;
    }

    /**
     * Validates the category for a new or edited offer. Null means "keep default"; the code
     * must exist and be enabled (as must its parent) so vendors cannot pick retired categories.
     */
    public String requireAssignable(String code) {
        String normalized = normalize(code);
        Category category = repository.findByCode(normalized)
                .orElseThrow(() -> new InvalidCategoryException("Unknown category: " + normalized));
        if (!isPubliclyEnabled(category)) {
            throw new InvalidCategoryException("Category is not available: " + normalized);
        }
        return category.getCode();
    }

    /**
     * Expands a filter code to itself plus its subcategories, so filtering by a parent category
     * also matches offers filed under a subcategory. Unknown codes are rejected.
     */
    public List<String> expandForFilter(String code) {
        Category category = repository.findByCode(normalize(code))
                .orElseThrow(() -> new InvalidCategoryException("Unknown category"));
        List<String> codes = new ArrayList<>();
        codes.add(category.getCode());
        repository.findByParentId(category.getId()).forEach(child -> codes.add(child.getCode()));
        return codes;
    }

    /** Enabled categories whose parent (if any) is also enabled, in display order. */
    public List<CategoryResponse> publicCategories() {
        List<Category> all = repository.findAllByOrderBySortOrderAscNameAsc();
        Map<UUID, Category> byId = all.stream().collect(Collectors.toMap(Category::getId, Function.identity()));
        return all.stream()
                .filter(c -> c.isEnabled() && (c.getParentId() == null
                        || (byId.containsKey(c.getParentId()) && byId.get(c.getParentId()).isEnabled())))
                .map(c -> CategoryResponse.from(c, byId))
                .toList();
    }

    public List<CategoryResponse> allCategories() {
        List<Category> all = repository.findAllByOrderBySortOrderAscNameAsc();
        Map<UUID, Category> byId = all.stream().collect(Collectors.toMap(Category::getId, Function.identity()));
        return all.stream().map(c -> CategoryResponse.from(c, byId)).toList();
    }

    @Transactional
    public CategoryResponse create(CategoryRequests.Create request) {
        String code = normalize(request.code());
        String slug = request.slug().trim();
        if (repository.existsByCode(code)) {
            throw new CategoryConflictException("A category with this code already exists");
        }
        if (repository.existsBySlug(slug)) {
            throw new CategoryConflictException("A category with this slug already exists");
        }
        UUID parentId = resolveParent(request.parentCode(), null);
        Category saved = repository.save(new Category(code, slug, request.name().trim(),
                blankToNull(request.description()), blankToNull(request.icon()), parentId,
                request.sortOrder() == null ? 0 : request.sortOrder()));
        return toResponse(saved);
    }

    @Transactional
    public CategoryResponse update(UUID id, CategoryRequests.Update request) {
        Category category = repository.findById(id).orElseThrow(CategoryNotFoundException::new);
        String slug = request.slug() == null ? null : request.slug().trim();
        if (slug != null && !slug.equals(category.getSlug()) && repository.existsBySlug(slug)) {
            throw new CategoryConflictException("A category with this slug already exists");
        }
        UUID parentId = request.parentCode() == null
                ? category.getParentId()
                : resolveParent(request.parentCode(), category);
        category.update(slug, request.name() == null ? null : request.name().trim(), request.description(),
                request.icon(), parentId, request.sortOrder(), request.enabled());
        return toResponse(repository.save(category));
    }

    /** Only two levels are supported: a parent must itself be top level and not the category. */
    private UUID resolveParent(String parentCode, Category editing) {
        if (parentCode == null || parentCode.isBlank()) {
            return null;
        }
        Category parent = repository.findByCode(normalize(parentCode))
                .orElseThrow(() -> new InvalidCategoryException("Unknown parent category"));
        if (parent.getParentId() != null) {
            throw new InvalidCategoryException("Subcategories cannot have their own subcategories");
        }
        if (editing != null) {
            if (parent.getId().equals(editing.getId())) {
                throw new InvalidCategoryException("A category cannot be its own parent");
            }
            if (!repository.findByParentId(editing.getId()).isEmpty()) {
                throw new InvalidCategoryException("A category with subcategories cannot become a subcategory");
            }
        }
        return parent.getId();
    }

    private boolean isPubliclyEnabled(Category category) {
        if (!category.isEnabled()) {
            return false;
        }
        return category.getParentId() == null
                || repository.findById(category.getParentId()).map(Category::isEnabled).orElse(false);
    }

    private CategoryResponse toResponse(Category category) {
        Map<UUID, Category> parent = category.getParentId() == null
                ? Map.of()
                : repository.findById(category.getParentId()).map(p -> Map.of(p.getId(), p)).orElse(Map.of());
        return CategoryResponse.from(category, parent);
    }

    static String normalize(String code) {
        return code == null ? DEFAULT_CODE : code.trim().toUpperCase(Locale.ROOT);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
