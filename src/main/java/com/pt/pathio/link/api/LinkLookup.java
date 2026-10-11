package com.pt.pathio.link.api;

import java.util.Optional;
import java.util.UUID;

/**
 * Contract the link module publishes for cross-module consumers ({@code analytics}).
 *
 * <p>Reads return immutable {@link LinkRef} values instead of JPA entities, and the click-count
 * mutation is exposed explicitly because {@code urls.click_count} is link-owned data that the
 * analytics flush pipeline must update inside its own transaction.</p>
 */
public interface LinkLookup {

    /** Resolves a short code to the URL's current id/owner view, or empty if the code is unused. */
    Optional<LinkRef> findByShortCode(String shortCode);

    /**
     * Adds {@code clicks} to the persisted click count of the URL identified by {@code linkId},
     * guarded by its {@code shortCode}. Returns the number of affected rows (0 when the URL was
     * deleted between resolution and mutation).
     */
    int incrementClicks(Long linkId, String shortCode, long clicks);

    /** Number of URLs currently owned by {@code ownerId}. */
    long countByOwner(UUID ownerId);

    /** Sum of persisted click counts across the URLs owned by {@code ownerId}. */
    long sumClicksByOwner(UUID ownerId);
}