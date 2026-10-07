package com.pt.pathio.auth;

import java.util.UUID;

/**
 * A lightweight, serialization-safe principal stored in the SecurityContext.
 * Using a record avoids holding the full User entity in-memory per request.
 */
public record UserPrincipal(UUID id, String email) {
}
