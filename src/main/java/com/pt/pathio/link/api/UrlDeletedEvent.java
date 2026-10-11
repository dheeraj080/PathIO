package com.pt.pathio.link.api;

/**
 * Lifecycle event published by the link module when a shortened URL is deleted (owner delete or
 * admin delete). The analytics module consumes it to purge short-code-addressed analytics state
 * (the unique-visitor HLL key and the unflushed pending buffer) so a later re-registration of the
 * same alias never inherits the previous link's counts (DB-01).
 */
public record UrlDeletedEvent(String shortCode) {}