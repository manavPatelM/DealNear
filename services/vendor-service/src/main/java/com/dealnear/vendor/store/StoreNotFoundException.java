package com.dealnear.vendor.store;

public class StoreNotFoundException extends RuntimeException {
    public StoreNotFoundException() {
        super("Store not found");
    }
}
