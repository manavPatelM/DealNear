package com.dealnear.vendor.api;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {
    @GetMapping("/health")
    Map<String, String> health() {
        return Map.of(
                "status", "ok",
                "service", "vendor-service",
                "version", "0.1.0"
        );
    }
}
