package com.pt.pathio.analytics.dto;

/**
 * One of the user's most-clicked links, returned by the all-links analytics view.
 */
public record TopLinkResponse(
        String shortCode,
        String shortUrl,
        String longUrl,
        long clickCount
) {
}