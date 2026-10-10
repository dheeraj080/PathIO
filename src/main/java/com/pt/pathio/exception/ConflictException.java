package com.pt.pathio.exception;

/**
 * Thrown when a requested resource conflicts with existing state,
 * e.g. claiming a custom alias that is already taken. Mapped to HTTP 409.
 */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
