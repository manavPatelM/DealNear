package com.dealnear.vendor.store;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** The reason is shown to the vendor so they can correct and resubmit the store. */
public record RejectStoreRequest(@NotBlank @Size(max = 500) String reason) {
}
