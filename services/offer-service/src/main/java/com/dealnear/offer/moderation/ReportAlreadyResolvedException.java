package com.dealnear.offer.moderation;

public class ReportAlreadyResolvedException extends RuntimeException {
    public ReportAlreadyResolvedException() {
        super("Report has already been resolved");
    }
}
