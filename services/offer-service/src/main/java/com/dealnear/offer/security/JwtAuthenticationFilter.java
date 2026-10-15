package com.dealnear.offer.security;

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
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) authenticate(header.substring(7));
        chain.doFilter(request, response);
    }
    private void authenticate(String token) {
        try {
            String[] parts = token.split("\\.", -1);
            if (parts.length != 3 || !verify(parts[0] + "." + parts[1], parts[2])) return;
            JsonNode claims = objectMapper.readTree(Base64.getUrlDecoder().decode(parts[1]));
            String subject = claims.path("sub").asText("");
            if (!subject.isBlank() && claims.path("role").asText("").equals("VENDOR")) {
                SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                        subject, null, java.util.List.of(new SimpleGrantedAuthority("ROLE_VENDOR"))));
            }
        } catch (IOException | RuntimeException ignored) {
            SecurityContextHolder.clearContext();
        }
    }
    private boolean verify(String input, String signature) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return MessageDigest.isEqual(mac.doFinal(input.getBytes(StandardCharsets.UTF_8)),
                    Base64.getUrlDecoder().decode(signature));
        } catch (Exception exception) {
            return false;
        }
    }
}
