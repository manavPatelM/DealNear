package com.dealnear.offer.offer;

public class InvalidPaginationException extends RuntimeException {
    public InvalidPaginationException() {
        super("Page must be non-negative and size must be between 1 and 50");
    }
}
