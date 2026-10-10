package com.pt.pathio.dto;

import java.time.LocalDateTime;

public record UrlAnalyticsResponse(
        String shortCode,
        String shortUrl,
        String longUrl,
        long totalClicks,
        long uniqueClicks,
        LocalDateTime createdAt
) {}