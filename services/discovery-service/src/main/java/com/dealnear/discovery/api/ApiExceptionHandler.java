package com.dealnear.discovery.api;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String, Object>> validationError() {
        return ResponseEntity.badRequest().body(Map.of(
                "error", Map.of("code", "VALIDATION_ERROR", "message", "Request validation failed")
        ));
    }

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Map<String, Object>> responseStatus(ResponseStatusException exception) {
        String code = switch (exception.getStatusCode().value()) {
            case 400 -> "BAD_REQUEST";
            case 401 -> "UNAUTHORIZED";
            case 403 -> "FORBIDDEN";
            case 404 -> "NOT_FOUND";
            default -> "ERROR";
        };
        String message = exception.getReason() != null ? exception.getReason() : "Request failed";
        return ResponseEntity.status(exception.getStatusCode()).body(Map.of(
                "error", Map.of("code", code, "message", message)
        ));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Map<String, Object>> unexpectedError() {
        return ResponseEntity.internalServerError().body(Map.of(
                "error", Map.of("code", "INTERNAL_ERROR", "message", "An unexpected error occurred")
        ));
    }
}
