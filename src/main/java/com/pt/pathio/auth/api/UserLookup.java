package com.pt.pathio.auth.api;

import java.util.Optional;
import java.util.UUID;

/**
 * Contract the auth module publishes for cross-module consumers ({@code link}).
 *
 * <p>Reads return immutable {@link UserView} values instead of JPA entities, so consumers can
 * resolve a user's existence/identity without importing auth implementation packages
 * ({@code auth.repository}, {@code auth.entity}, ...).</p>
 */
public interface UserLookup {

    /** Resolves a user id to its published view, or empty if no such user exists. */
    Optional<UserView> findUser(UUID id);
}