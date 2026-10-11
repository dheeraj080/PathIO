package com.pt.pathio.auth.api;

import java.util.UUID;

/**
 * Read-only view of a user published by the auth module for cross-module consumers through
 * {@link UserLookup}. Never exposes the JPA entity; it carries only the fields a consumer needs.
 *
 * @param id the user's stable identifier
 */
public record UserView(UUID id) {
}