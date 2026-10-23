package com.dealnear.offer.api;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import com.dealnear.offer.offer.StoreOwnershipException;
import com.dealnear.offer.offer.InvalidPaginationException;
import com.dealnear.offer.offer.OfferNotFoundException;
import com.dealnear.offer.ownership.StoreSummaryUnavailableException;
import com.dealnear.offer.category.CategoryExceptions;
import com.dealnear.offer.offer.InvalidOfferValidityException;
import com.dealnear.offer.offer.InvalidOfferTransitionException;
import com.dealnear.offer.offer.StoreNotVerifiedException;
import com.dealnear.offer.moderation.ReportAlreadyResolvedException;
import com.dealnear.offer.moderation.ReportNotFoundException;

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

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<Map<String, Object>> unreadableBody() {
        return ResponseEntity.badRequest().body(Map.of("error",
                Map.of("code", "INVALID_REQUEST", "message",
                        "Request body is malformed or contains an invalid value")));
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

    @ExceptionHandler(InvalidOfferTransitionException.class)
    ResponseEntity<Map<String, Object>> invalidOfferTransition(InvalidOfferTransitionException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error",
                Map.of("code", "INVALID_OFFER_TRANSITION", "message", exception.getMessage())));
    }

    @ExceptionHandler(StoreNotVerifiedException.class)
    ResponseEntity<Map<String, Object>> storeNotVerified(StoreNotVerifiedException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error",
                Map.of("code", "STORE_NOT_VERIFIED", "message", exception.getMessage())));
    }

    @ExceptionHandler(ReportNotFoundException.class)
    ResponseEntity<Map<String, Object>> reportNotFound() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error",
                Map.of("code", "REPORT_NOT_FOUND", "message", "Report not found")));
    }

    @ExceptionHandler(ReportAlreadyResolvedException.class)
    ResponseEntity<Map<String, Object>> reportAlreadyResolved() {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error",
                Map.of("code", "REPORT_ALREADY_RESOLVED", "message", "Report has already been resolved")));
    }

    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    ResponseEntity<Map<String, Object>> accessDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error",
                Map.of("code", "FORBIDDEN", "message", "Access forbidden")));
    }

    @ExceptionHandler(CategoryExceptions.InvalidCategoryException.class)
    ResponseEntity<Map<String, Object>> invalidCategory(RuntimeException exception) {
        return ResponseEntity.badRequest().body(Map.of("error",
                Map.of("code", "INVALID_CATEGORY", "message", exception.getMessage())));
    }

    @ExceptionHandler(CategoryExceptions.CategoryNotFoundException.class)
    ResponseEntity<Map<String, Object>> categoryNotFound() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error",
                Map.of("code", "CATEGORY_NOT_FOUND", "message", "Category not found")));
    }

    @ExceptionHandler({CategoryExceptions.CategoryConflictException.class,
            org.springframework.dao.DataIntegrityViolationException.class})
    ResponseEntity<Map<String, Object>> categoryConflict(RuntimeException exception) {
        String message = exception instanceof CategoryExceptions.CategoryConflictException
                ? exception.getMessage() : "The request conflicts with existing data";
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error",
                Map.of("code", "CONFLICT", "message", message)));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Map<String, Object>> unexpectedError() {
        return ResponseEntity.internalServerError().body(Map.of("error",
                Map.of("code", "INTERNAL_ERROR", "message", "An unexpected error occurred")));
    }
}
