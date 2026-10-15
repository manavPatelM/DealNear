package com.dealnear.identity.api;

import com.dealnear.identity.user.User;
import com.dealnear.identity.user.UserRepository;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.core.Authentication;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserRepository users;
    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder();
    private final byte[] secret;
    private final long tokenTtlSeconds;

    public AuthController(
            UserRepository users,
            @Value("${dealnear.jwt-secret}") String secret,
            @Value("${dealnear.jwt-ttl-seconds:3600}") long tokenTtlSeconds
    ) {
        if (tokenTtlSeconds <= 0) {
            throw new IllegalArgumentException("dealnear.jwt-ttl-seconds must be positive");
        }
        this.users = users;
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        this.tokenTtlSeconds = tokenTtlSeconds;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody AuthRequests.Register request) {
        String email = request.email().trim().toLowerCase();
        if (users.findByEmailIgnoreCase(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
        }
        User user = users.save(new User(email, passwords.encode(request.password()), "CUSTOMER"));
        return issue(user);
    }

    @PostMapping("/register/vendor")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse registerVendor(@Valid @RequestBody AuthRequests.VendorRegister request) {
        String email = request.email().trim().toLowerCase();
        if (users.findByEmailIgnoreCase(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
        }
        User user = users.save(new User(email, passwords.encode(request.password()), "VENDOR"));
        return issue(user);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody AuthRequests.Login request) {
        User user = users.findByEmailIgnoreCase(request.email().trim())
                .filter(candidate -> passwords.matches(request.password(), candidate.getPasswordHash()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));
        return issue(user);
    }

    @GetMapping("/me")
    public ProfileResponse profile(Authentication authentication) {
        User user = users.findById(java.util.UUID.fromString(authentication.getName()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));
        return new ProfileResponse(user.getId(), user.getEmail(), user.getRole());
    }

    private AuthResponse issue(User user) {
        Instant issuedAt = Instant.now();
        Instant expiresAt = issuedAt.plusSeconds(tokenTtlSeconds);
        return new AuthResponse(user.getId(), user.getEmail(), user.getRole(),
                token(user, issuedAt, expiresAt), expiresAt);
    }

    private String token(User user, Instant issuedAt, Instant expiresAt) {
        String header = encode("{\"alg\":\"HS256\",\"typ\":\"JWT\"}");
        String payload = encode("{\"sub\":\"" + user.getId() + "\",\"role\":\"" + user.getRole()
                + "\",\"iat\":" + issuedAt.getEpochSecond()
                + ",\"exp\":" + expiresAt.getEpochSecond() + "}");
        String input = header + "." + payload;
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return input + "." + encode(mac.doFinal(input.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Could not create access token", exception);
        }
    }

    private String encode(String value) { return encode(value.getBytes(StandardCharsets.UTF_8)); }
    private String encode(byte[] value) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value);
    }

    public record AuthResponse(java.util.UUID userId, String email, String role, String accessToken,
            Instant expiresAt) {}
    public record ProfileResponse(java.util.UUID userId, String email, String role) {}
}
