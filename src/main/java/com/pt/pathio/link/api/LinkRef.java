package com.pt.pathio.link.api;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Read-only view of a shortened link published by the link module for cross-module consumers
 * (analytics) through {@link LinkLookup}. Never exposes the JPA entity; it carries only the fields
 * the analytics module needs to build its responses and flush its buffers.
 *
 * @param id         immutable database id, used to bind analytics rows to the exact URL record (DB-01)
 * @param shortCode  the (reusable) alias
 * @param longUrl    the destination URL
 * @param clickCount the current persisted click total
 * @param createdAt  creation timestamp
 * @param ownerId    id of the owning user, or {@code null} for legacy anonymous links
 */
public record LinkRef(
        Long id,
        String shortCode,
        String longUrl,
        long clickCount,
        LocalDateTime createdAt,
        UUID ownerId
) {}