package com.dealnear.offer.api;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import com.dealnear.offer.offer.StoreOwnershipException;
import com.dealnear.offer.offer.InvalidPaginationException;
import com.dealnear.offer.offer.OfferNotFoundException;
import com.dealnear.offer.ownership.StoreSummaryUnavailableException;
import com.dealnear.offer.offer.InvalidOfferValidityException;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String, Object>> validationError() {
        return ResponseEntity.badRequest().body(Map.of("error",
                Map.of("code", "VALIDATION_ERROR", "message", "Request validation failed")));
    }

    @ExceptionHandler(StoreOwnershipException.class)
    ResponseEntity<Map<String, Object>> storeOwnershipError() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error",
                Map.of("code", "STORE_NOT_FOUND", "message", "Store not found")));
    }

    @ExceptionHandler(OfferNotFoundException.class)
    ResponseEntity<Map<String, Object>> offerNotFound() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error",
                Map.of("code", "OFFER_NOT_FOUND", "message", "Offer not found")));
    }

    @ExceptionHandler(InvalidPaginationException.class)
    ResponseEntity<Map<String, Object>> invalidPagination() {
        return ResponseEntity.badRequest().body(Map.of("error",
                Map.of("code", "INVALID_PAGINATION", "message",
                        "Page must be non-negative and size must be between 1 and 50")));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<Map<String, Object>> invalidPathParameter() {
        return ResponseEntity.badRequest().body(Map.of("error",
                Map.of("code", "INVALID_REQUEST", "message",
                        "Request contains an invalid parameter")));
    }

    @ExceptionHandler(StoreSummaryUnavailableException.class)
    ResponseEntity<Map<String, Object>> storeSummaryUnavailable() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("error",
                Map.of("code", "STORE_SUMMARY_UNAVAILABLE",
                        "message", "Store details are temporarily unavailable")));
    }

    @ExceptionHandler(InvalidOfferValidityException.class)
    ResponseEntity<Map<String, Object>> invalidOfferValidity(InvalidOfferValidityException exception) {
        return ResponseEntity.badRequest().body(Map.of("error",
                Map.of("code", "INVALID_OFFER_VALIDITY", "message", exception.getMessage())));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Map<String, Object>> unexpectedError() {
        return ResponseEntity.internalServerError().body(Map.of("error",
                Map.of("code", "INTERNAL_ERROR", "message", "An unexpected error occurred")));
    }
}
