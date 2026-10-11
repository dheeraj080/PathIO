package com.pt.pathio.auth.dto;

import com.pt.pathio.auth.entity.ApiKey;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

/**
 * Public view of an API key. Never exposes {@code key_hash} — only metadata the owner is allowed
 * to see.
 */
@Schema(description = "API key metadata; the key digest itself is never exposed")
public record ApiKeyResponse(
        @Schema(description = "Stable key id (used to revoke)", example = "42") Long id,
        @Schema(description = "Human-readable label", example = "ci-deploy") String name,
        @Schema(description = "Whether the key currently authenticates requests") boolean active,
        @Schema(description = "Creation time (UTC)") Instant createdAt,
        @Schema(description = "Expiry (UTC); null = never expires", nullable = true) Instant expiresAt,
        @Schema(description = "Last successful use (UTC); null = unused yet", nullable = true) Instant lastUsedAt
) {

    public static ApiKeyResponse from(ApiKey key) {
        return new ApiKeyResponse(
                key.getId(),
                key.getName(),
                key.isActive(),
                key.getCreatedAt(),
                key.getExpiresAt(),
                key.getLastUsedAt());
    }
}