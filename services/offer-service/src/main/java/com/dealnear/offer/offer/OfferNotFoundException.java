package com.dealnear.offer.offer;

public class OfferNotFoundException extends RuntimeException {
    public OfferNotFoundException() {
        super("Offer not found");
    }
}
