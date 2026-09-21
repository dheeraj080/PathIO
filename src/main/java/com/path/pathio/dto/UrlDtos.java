package com.path.pathio.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.hibernate.validator.constraints.URL;

import java.time.Instant;

public class UrlDtos {

    public record ShortenRequest(
            @NotBlank(message = "Original URL cannot be blank")
            @URL(message = "Invalid URL format")
            @Size(max = 2048, message = "URL is too long")
            String originalUrl,

            Long userId,
            Instant expiresAt
    ) {
    }

    public record ShortenResponse(
            String shortCode,
            String shortUrl,
            String originalUrl,
            Instant createdAt,
            Instant expiresAt
    ) {
    }
}
