package com.pt.pathio.link.api;

/**
 * Lifecycle event published by the link module when a shortened URL's destination is updated.
 * Part of the {@code link.api} contract so a future analytics consumer (e.g. a cache keyed by
 * short code) can react without any link-to-analytics import.
 */
public record UrlUpdatedEvent(String shortCode) {}