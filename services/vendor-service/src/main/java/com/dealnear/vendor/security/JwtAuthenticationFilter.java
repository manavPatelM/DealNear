package com.dealnear.vendor.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final ObjectMapper objectMapper;
    private final byte[] secret;

    public JwtAuthenticationFilter(ObjectMapper objectMapper, String secret) {
        this.objectMapper = objectMapper;
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String authorization = request.getHeader("Authorization");
        if (authorization != null && authorization.startsWith("Bearer ")) {
            authenticate(authorization.substring(7));
        }
        filterChain.doFilter(request, response);
    }

    private void authenticate(String token) {
        try {
            String[] parts = token.split("\\.", -1);
            if (parts.length != 3 || !verify(parts[0] + "." + parts[1], parts[2])) {
                return;
            }
            JsonNode claims = objectMapper.readTree(
                    Base64.getUrlDecoder().decode(parts[1])
            );
            // Tokens without a future expiry are rejected so leaked tokens stop working.
            if (isExpired(claims)) {
                return;
            }
            String subject = claims.path("sub").asText("");
            String role = claims.path("role").asText("");
            if (!subject.isBlank() && (role.equals("VENDOR") || role.equals("ADMIN"))) {
                var authentication = new UsernamePasswordAuthenticationToken(
                        subject,
                        null,
                        java.util.List.of(new SimpleGrantedAuthority("ROLE_" + role))
                );
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (IOException | RuntimeException ignored) {
            SecurityContextHolder.clearContext();
        }
    }

    private boolean isExpired(JsonNode claims) {
        JsonNode exp = claims.path("exp");
        return !exp.canConvertToLong() || exp.asLong() <= java.time.Instant.now().getEpochSecond();
    }

    private boolean verify(String signingInput, String encodedSignature) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            byte[] expected = mac.doFinal(signingInput.getBytes(StandardCharsets.UTF_8));
            byte[] actual = Base64.getUrlDecoder().decode(encodedSignature);
            return MessageDigest.isEqual(expected, actual);
        } catch (Exception exception) {
            return false;
        }
    }
}
