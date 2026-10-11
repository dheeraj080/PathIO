package com.pt.pathio.auth.controller;

import com.pt.pathio.auth.api.OAuthOnlyException;
import com.pt.pathio.shared.error.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Auth-owned {@link RestControllerAdvice} mapping {@link OAuthOnlyException} to
 * {@code 403 OAUTH_ONLY}. Runs at {@link Ordered#HIGHEST_PRECEDENCE} so it is consulted before
 * the shared {@code shared.error.GlobalExceptionHandler} catch-all; the shared handler must not
 * import an application module, so this auth-local mapping lives here.
 */
@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class OAuthOnlyExceptionHandler {

    @ExceptionHandler(OAuthOnlyException.class)
    public ResponseEntity<ApiError> handleOAuthOnly(OAuthOnlyException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                ApiError.of(403, "OAUTH_ONLY", ex.getMessage(), request.getRequestURI()));
    }
}