package com.pt.pathio.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

@Schema(description = "Request to mint a new API key")
public record CreateApiKeyRequest(

        @Schema(description = "Human-readable label for the key", example = "ci-deploy")
        @NotBlank(message = "Key name is required")
        @Size(max = 64, message = "Key name must be at most 64 characters")
        String name,

        @Schema(description = "Optional validity window in days; null means the key never expires",
                example = "90", nullable = true)
        @Positive(message = "expiresInDays must be null or a positive number of days")
        Integer expiresInDays
) {
}