package com.dealnear.offer.moderation;

public class ReportNotFoundException extends RuntimeException {
    public ReportNotFoundException() {
        super("Report not found");
    }
}
