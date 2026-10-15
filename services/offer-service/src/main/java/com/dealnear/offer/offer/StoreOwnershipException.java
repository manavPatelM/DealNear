package com.dealnear.offer.offer;

public class StoreOwnershipException extends RuntimeException {
    public StoreOwnershipException() {
        super("The vendor does not own the requested store");
    }
}
