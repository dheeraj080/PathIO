package com.pt.pathio.auth.api;

import java.util.UUID;

/**
 * A lightweight, serialization-safe principal stored in the SecurityContext.
 * Using a record avoids holding the full User entity in-memory per request.
 *
 * <p>Part of the published {@code auth.api} contract: other modules (e.g. {@code link}) may read
 * the authenticated principal without touching auth implementation packages.</p>
 */
public record UserPrincipal(UUID id, String email) {
}
