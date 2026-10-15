package com.dealnear.identity.user;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Admins cannot self-register. When both ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD
 * are configured, the first admin account is created at startup if that email is unused.
 * An existing account with the same email is never modified.
 */
@Component
public class AdminBootstrap implements ApplicationRunner {
    private static final Logger LOGGER = LoggerFactory.getLogger(AdminBootstrap.class);
    private final UserRepository users;
    private final String email;
    private final String password;

    public AdminBootstrap(
            UserRepository users,
            @Value("${dealnear.bootstrap-admin.email:}") String email,
            @Value("${dealnear.bootstrap-admin.password:}") String password
    ) {
        this.users = users;
        this.email = email.trim().toLowerCase();
        this.password = password;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (email.isBlank() || password.isBlank()) {
            return;
        }
        if (password.length() < 12) {
            throw new IllegalStateException("ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters");
        }
        if (users.findByEmailIgnoreCase(email).isPresent()) {
            return;
        }
        users.save(new User(email, new BCryptPasswordEncoder().encode(password), "ADMIN"));
        LOGGER.info("Bootstrap admin account created");
    }
}
