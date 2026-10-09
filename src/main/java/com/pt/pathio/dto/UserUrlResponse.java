package com.pt.pathio.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDateTime;

public record UserUrlResponse(
        String shortCode,
        String shortUrl,
        String longUrl,
        long clickCount,
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'", timezone = "UTC")
        LocalDateTime createdAt
) {}
