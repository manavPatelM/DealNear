package com.dealnear.offer.category;

public final class CategoryExceptions {
    private CategoryExceptions() {
    }

    /** An offer or filter referenced a category code that is unknown or not allowed here. */
    public static class InvalidCategoryException extends RuntimeException {
        public InvalidCategoryException(String message) {
            super(message);
        }
    }

    public static class CategoryNotFoundException extends RuntimeException {
        public CategoryNotFoundException() {
            super("Category not found");
        }
    }

    public static class CategoryConflictException extends RuntimeException {
        public CategoryConflictException(String message) {
            super(message);
        }
    }
}
