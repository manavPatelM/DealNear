package com.dealnear.discovery.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class DiscoveryCategoriesTest {
    @Test
    void treatsMissingOrBlankFilterAsNoFilter() {
        assertThat(DiscoveryCategories.filter(null)).isNull();
        assertThat(DiscoveryCategories.filter("  ")).isNull();
    }

    @Test
    void normalizesCategoryCodes() {
        assertThat(DiscoveryCategories.filter(" food_and_drink ")).isEqualTo("FOOD_AND_DRINK");
    }

    @Test
    void rejectsCodesThatAreNotSimpleIdentifiers() {
        assertThatThrownBy(() -> DiscoveryCategories.filter("FOOD' OR '1'='1"))
                .isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> DiscoveryCategories.filter("A".repeat(33)))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void defaultsLegacyProjectionsWithoutCategoryToOther() {
        assertThat(DiscoveryCategories.projected(null)).isEqualTo("OTHER");
        assertThat(DiscoveryCategories.projected("GROCERY")).isEqualTo("GROCERY");
    }

    @Test
    void parsesCommaSeparatedCategoryLists() {
        assertThat(DiscoveryCategories.filterList(null)).isEmpty();
        assertThat(DiscoveryCategories.filterList("food_and_drink, CAFES,cafes,"))
                .containsExactly("FOOD_AND_DRINK", "CAFES");
        assertThatThrownBy(() -> DiscoveryCategories.filterList(String.join(",",
                java.util.stream.IntStream.range(0, 21).mapToObj(i -> "C" + (char) ('A' + i)).toList())))
                .isInstanceOf(ResponseStatusException.class);
    }
}
