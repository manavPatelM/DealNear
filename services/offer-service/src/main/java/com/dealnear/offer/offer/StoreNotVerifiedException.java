package com.dealnear.offer.offer;

public class StoreNotVerifiedException extends RuntimeException {
    public StoreNotVerifiedException() {
        super("The store must be verified by an admin before its offers can go live");
    }
}
