package com.dealnear.vendor.api;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import com.dealnear.vendor.store.StoreNotFoundException;
import com.dealnear.vendor.store.InvalidPaginationException;
import com.dealnear.vendor.store.InvalidProjectionTokenException;
import com.dealnear.vendor.store.InvalidStoreTransitionException;
import org.springframework.http.converter.HttpMessageNotReadableException;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String, Object>> validationError() {
        return ResponseEntity.badRequest().body(Map.of(
                "error", Map.of("code", "VALIDATION_ERROR", "message", "Request validation failed")
        ));
    }

    @ExceptionHandler(StoreNotFoundException.class)
    ResponseEntity<Map<String, Object>> storeNotFound() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "error", Map.of("code", "STORE_NOT_FOUND", "message", "Store not found")
        ));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<Map<String, Object>> invalidPathParameter() {
        return ResponseEntity.badRequest().body(Map.of(
                "error", Map.of("code", "INVALID_REQUEST", "message", "Request contains an invalid parameter")
        ));
    }

    @ExceptionHandler(InvalidPaginationException.class)
    ResponseEntity<Map<String, Object>> invalidPagination() {
        return ResponseEntity.badRequest().body(Map.of(
                "error", Map.of("code", "INVALID_PAGINATION", "message",
                        "Page must be non-negative and size must be between 1 and 50")
        ));
    }

    @ExceptionHandler(InvalidStoreTransitionException.class)
    ResponseEntity<Map<String, Object>> invalidStoreTransition(InvalidStoreTransitionException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "error", Map.of("code", "INVALID_STORE_TRANSITION", "message", exception.getMessage())
        ));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<Map<String, Object>> unreadableBody() {
        return ResponseEntity.badRequest().body(Map.of(
                "error", Map.of("code", "INVALID_REQUEST", "message",
                        "Request body is malformed or contains an invalid value")
        ));
    }

    @ExceptionHandler(InvalidProjectionTokenException.class)
    ResponseEntity<Map<String, Object>> invalidProjectionToken() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "error", Map.of("code", "UNAUTHORIZED", "message", "Invalid projection token")
        ));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Map<String, Object>> unexpectedError() {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", Map.of("code", "INTERNAL_ERROR", "message", "An unexpected error occurred")
        ));
    }
}
