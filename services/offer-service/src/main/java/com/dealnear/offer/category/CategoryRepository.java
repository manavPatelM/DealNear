package com.dealnear.offer.category;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, UUID> {
    Optional<Category> findByCode(String code);

    Optional<Category> findBySlug(String slug);

    List<Category> findByParentId(UUID parentId);

    boolean existsByCode(String code);

    boolean existsBySlug(String slug);

    List<Category> findAllByOrderBySortOrderAscNameAsc();
}
