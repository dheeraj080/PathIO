package com.pt.pathio.auth.exceptions;

import com.pt.pathio.auth.dto.ApiError;
import com.pt.pathio.exception.ResourceNotFoundException;
import io.jsonwebtoken.ExpiredJwtException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.CredentialsExpiredException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining("; "));
        return ResponseEntity.badRequest().body(
                ApiError.of(400, "Bad Request", message, request.getRequestURI()));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiError> handleResourceNotFoundException(ResourceNotFoundException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
                ApiError.of(404, "Not Found", ex.getMessage(), request.getRequestURI()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleIllegalArgumentException(IllegalArgumentException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                ApiError.of(400, "Bad Request", ex.getMessage(), request.getRequestURI()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleAccessDenied(AccessDeniedException e, HttpServletRequest request) {
        // Anonymous callers get 401; authenticated-but-unauthorised callers get 403
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth instanceof AnonymousAuthenticationToken || !auth.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                    ApiError.of(401, "Unauthorized",
                            "Full authentication is required to access this resource",
                            request.getRequestURI()));
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                ApiError.of(HttpStatus.FORBIDDEN.value(),
                        "Forbidden",
                        e.getMessage() != null && !e.getMessage().isBlank() ? e.getMessage() : "Access is denied",
                        request.getRequestURI()));
    }

    @ExceptionHandler({
            UsernameNotFoundException.class,
            BadCredentialsException.class,
            CredentialsExpiredException.class,
            AuthenticationException.class
    })
    public ResponseEntity<ApiError> handleAuthException(Exception e, HttpServletRequest request) {
        log.error(e.getMessage(), e.getCause());
        HttpStatus status = HttpStatus.UNAUTHORIZED;

        var apiError = ApiError.of(
                status.value(),
                "Unauthorized",
                e.getMessage(),
                request.getRequestURI()
        );

        return ResponseEntity.status(status).body(apiError);
    }

    @ExceptionHandler(ExpiredJwtException.class)
    public ResponseEntity<ApiError> handleExpiredJwt(ExpiredJwtException e, HttpServletRequest request) {
        var apiError = ApiError.of(
                HttpStatus.UNAUTHORIZED.value(),
                "Unauthorized",
                "Your session has expired. Please login again.",
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(apiError);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleGlobalException(Exception ex, HttpServletRequest request) {
        log.error("Global Exception caught: ", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                ApiError.of(500, "Internal Server Error", ex.getMessage(), request.getRequestURI()));
    }
}