package com.dealnear.identity.api;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthRequests {
    private AuthRequests() {}
    public record Register(@NotBlank @Email String email, @NotBlank @Size(min = 8, max = 128) String password) {}
    public record VendorRegister(@NotBlank @Email String email, @NotBlank @Size(min = 8, max = 128) String password) {}
    public record Login(@NotBlank @Email String email, @NotBlank String password) {}
}
