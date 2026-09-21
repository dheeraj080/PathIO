package com.path.pathio.analytics;

import java.time.Instant;

public record ClickEvent(
        String shortCode,
        String ipHash,
        String userAgent,
        String referer,
        Instant timestamp
) {
}