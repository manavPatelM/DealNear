package com.dealnear.vendor.store;

public class InvalidStoreTransitionException extends RuntimeException {
    public InvalidStoreTransitionException(String message) {
        super(message);
    }
}
