package com.pt.pathio.event;

import java.time.Instant;

public record UrlClickedEvent(
        String shortCode,
        String referrer,
        String userAgent,
        Instant occurredAt
) {
    public UrlClickedEvent(String shortCode) {
        this(shortCode, null, null, Instant.now());
    }
}
