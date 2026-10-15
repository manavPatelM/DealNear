package com.dealnear.offer.moderation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class ModerationRequests {
    private ModerationRequests() {
    }

    public record CreateReport(@NotNull OfferReport.Reason reason, @Size(max = 500) String details) {
    }

    public record Dismiss(@Size(max = 500) String note) {
    }

    /** The reason is shown to the vendor on the removed offer. */
    public record RemoveOffer(@NotBlank @Size(max = 500) String reason) {
    }
}
